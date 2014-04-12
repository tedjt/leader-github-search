var Crawler = require('htmlcrawler');
var debug = require('debug')('leader:githubsearcher');
var extend = require('extend');
var defaults = require('defaults');
var GitHubApi = require('github');
var Levenshtein = require('levenshtein');

var SEARCH_URL = 'https://github.com/search?type=Users&ref=searchresults&q=';

/**
 * Create a new leader plugin.
 *
 * @param {Object}
 */

module.exports = function (options) {
  return { fn: middleware(options), wait: wait};
};

module.exports.test = {
  validateName: validateName
};

/**
 * Create a Github search leader plugin.
 *
 * @param {Object} options
 * @return {Function}
 */

function middleware (options) {
  options = options || {};
  var crawler = new Crawler();
  var ghApi = null;
  if (options.api) {
    ghApi = new GitHubApi({
      version: '3.0.0',
      // optional
      timeout: 5000
    });
    ghApi.authenticate({
      type: 'oauth',
      key: options.api.clientId,
      secret: options.api.secret
    });
  }
  return function githubSearch (person, context, next) {
    var query = getSearchTerm(person, context);
    if (!query) return next();
    debug('query github with query %s ..', query);
    searchCrawl(crawler, query, person, context, next);
    /*
    if (ghApi) {
      searchApi(ghApi, query, person, context, next);
    } else {
      searchCrawl(crawler, query, person, context, next);
    }
    */
  };
}

function searchCrawl(crawler, query, person, context, next) {
  var url = SEARCH_URL + encodeURIComponent(query);
  crawler.load(url, function(err, $) {
    if (err) return next(err);
    var firstResult = $('.user-list-info').first();
    if (!firstResult) {
      return next();
    }
    var username = firstResult.find('a').first().text();
    var email = decodeURIComponent(firstResult.find('a.email').attr('data-email'));
    if (email) {
      // strip out html characters
      email = email.replace(/<.*?>/g, '');
    }
    var nameArr = firstResult.text().split(/\s+/).filter(function(i) { return !!i; } );
    var meta = firstResult.find('.user-list-meta').text().split(/\s+/).filter(function(i) { return !!i; })[0];
    var name = nameArr.slice(1, nameArr.indexOf(meta)).join(' ');
    if (!validateName(name, query)) {
      debug('not saving github search since name: %s is too different from query %s', name, query);
      return next();
    }

    var github = {
      username: username,
      url: 'https://github.com/' + username
    };
    if (email && email !== 'undefined') {
      github.email = email;
    }
    extend(true, context, { github: { search: github }});
    extend(true, person, { github: github });
    debug('Updated Github info from search with query %s ..', query);
    return next();
  });
}

function searchApi(api, query, person, context, next) {
  api.search.users(
    {q: encodeURIComponent(query)},
    function(err, res) {
      console.log(res);
      if (err) return callback(err);
      var firstResult = res.items[0];
      if (!firstResult) {
        return next();
      }
      if (firstResult.score < 7) {
        debug('not saving github search since name: %s had too low a score %f', query, firstResult.score);
        return next();
      }
      var github = {
        username: firstResult.login,
        url: 'https://github.com/' + firstResult.login,
        id: firstResult.id
      };
      extend(true, context, { github: { search: github }});
      extend(true, person, { github: github });
      debug('Updated Github info from search with query %s ..', query);
      return next();
    }
  );
}

function validateName(name, query) {
  // first and last only.
  if (name) {
    var first = name.split(/\s+/).slice(0, 1)[0];
    var last = name.split(/\s+/).slice(-1)[0];
    var qFirst = query.split(/\s+/).slice(0, 1)[0];
    var qLast = query.split(/\s+/).slice(-1)[0];

    var firstLev = new Levenshtein(first, qFirst);
    var lastLev = new Levenshtein(last, qLast);
    var totalLev = new Levenshtein(name, query);

    if ((firstLev.distance < 10 && lastLev.distance < 7) || totalLev.distance < 8) {
      return true;
    }
  }
  return false;
}

/**
 * Wait until we have an interesting search term.
 *
 * @param {Object} context
 * @param {Object} person
 * @return {Boolean}
 */

function wait (person, context) {
  return getSearchTerm(person, context) && !(person.github && person.github.username);
}

/**
 * Get the angelList search term.
 *
 * @param {Object} person
 * @param {Object} context
 * @return {String}
 */

function getSearchTerm (person, context) {
  var name = person.name;
  if (name && name.trim().split(/\s+/).length > 1) {
    return name;
  } else {
    return null;
  }
}
