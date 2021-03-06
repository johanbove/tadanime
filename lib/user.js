/**
 * author: Pieter Heyvaert (pheyvaer.heyvaert@ugent.be)
 * Ghent University - imec - IDLab
 */

const Comunica = require('@comunica/actor-init-sparql-rdfjs');
const Q = require('q');
const streamifyArray = require('streamify-array');

class User {

  constructor(webid) {
    this.webid = webid;
    this.podURL = this._getPODUrlFromWebID();
    this.dataURL = null;
  }

  getWebID() {
    return this.webid;
  }

  setStore(store) {
    this.store = store;
  }

  getDataURL() {
    return this.dataURL;
  }

  setDataURL(url) {
    this.dataURL = url;
  }

  getPodURL() {
    return this.podURL;
  }

  _getPODUrlFromWebID() {
    let prefix = 'http://';

    if (this.webid.startsWith('https://') !== -1) {
      prefix = 'https://';
    }

    const temp = this.webid.replace('http://', '').replace('https://', '');

    if (temp.indexOf('/') !== -1) {
      return prefix + temp.substr(0, temp.indexOf('/') + 1);
    } else {
      return null;
    }
  }

  getAllAnimeURLs() {
    return this.store.getQuads(null, 'http://schema.org/object', null).map(a => a.object.value);
  }

  getRatingForAnime(animeURL) {
    const deferred = Q.defer();

    const source = {
      match: (s, p, o, g) => {
        return streamifyArray(this.store.getQuads(s, p, o, g));
      }
    };

    const myEngine = Comunica.newEngine();
    const query = `SELECT ?ratingValue {
      ?action ?p <${animeURL}>;
        <http://schema.org/review> ?review.
      ?review <http://schema.org/starRating> ?rating.
      ?rating <http://schema.org/ratingValue> ?ratingValue.
    }`;

    myEngine.query(query,
      {sources: [{type: 'rdfjsSource', value: source}]})
      .then(function (result) {
        result.bindingsStream.on('data', function (data) {
          // Each data object contains a mapping from variables to RDFJS terms.
          //console.log(data.get('?ratingValue'));
          let result = parseInt(data.get('?ratingValue').value) / 2;

          if (isNaN(result)) {
            result = null;
          }

          deferred.resolve(result);
        });

        result.bindingsStream.on('end', function () {
          deferred.resolve(null);
        });
      });

    return deferred.promise;
  }

  getRatingURLForAnime(animeURL) {
    const deferred = Q.defer();

    const source = {
      match: (s, p, o, g) => {
        return streamifyArray(this.store.getQuads(s, p, o, g));
      }
    };

    const myEngine = Comunica.newEngine();
    const query = `SELECT ?rating {
    ?action ?p <${animeURL}>;
      <http://schema.org/review> ?review.
    ?review <http://schema.org/starRating> ?rating.
  }`;

    myEngine.query(query,
      { sources: [ { type: 'rdfjsSource', value: source } ] })
      .then(function (result) {
        result.bindingsStream.on('data', function (data) {
          deferred.resolve(data.get('?rating').value);
        });

        result.bindingsStream.on('end', function () {
          deferred.resolve(null);
        });
      });

    return deferred.promise;
  }
}

module.exports = User;