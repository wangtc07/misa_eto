/* VERSION: Typescript */
(function (){
/**
 * GLOBAL WOVNio OBJECT
 * Dynamically loaded components must call the registerComponent
 * method to be available to Widget for loading
 *
 * Components in the scrip can make themselves available to
 * Widget by assigning themselves to the components object using
 * their component name as the key
 **/
// only run once
if (document.WOVNIO)
  return;

var components = {};


var Widget = function (components, options) {
  if (!options) options = {};
  //var that = this;
  var instance = {};
  var installedComponents = {};
  var cachedData = [];
  var DATA_TIMEOUT = 5000;
  var isDisableLoadTranslation = false;

  document.WOVNIO = function () {
    var obj = {};
    obj.registerComponent = function (componentName, component) {
      components[componentName] = component;
      delete installedComponents[componentName];
      // dispatch load event
      var loadEvent = document.createEvent('Event');
      var eventName = componentName + 'Loaded';
      loadEvent.initEvent(eventName, true, true);
      document.dispatchEvent(loadEvent);
    };
    return obj;
  }();

  var insertedSrcs = [];
  var html = options.scriptTag || document.currentScript || function () {
    var scriptTags = document.getElementsByTagName('script');

    // this should return on the first loop iteration
    for (var i = scriptTags.length - 1; i >= 0; i--) {
      if (scriptTags[i].getAttribute('data-wovnio'))
        return scriptTags[i];
    }
    return scriptTags[scriptTags.length - 1];

  }();
  instance.tag = {
    html: html,
    getAttribute: function (attr) {
      attr = (typeof attr === 'string') ? attr : '';
      var hasAttr = html.hasAttribute ? html.hasAttribute(attr) : (html[attr] !== undefined);
      if (hasAttr) {
        return html.getAttribute(attr);
      }
      else {
        var rx = new RegExp(attr + '=([^&]*)', 'i');
        var fallbackKey = instance.isTest ? 'key=Tok3n': "''"
        var match = (html.getAttribute('data-wovnio') || fallbackKey).match(rx);
        return match ? (match[1] === 'false' ? false : match[1]) : '';
      }
    },
    /**
     * Insert an script tag with the specified src and attributes to the previous of the wovn script.
     * @param {String} srcAttr the src of the script
     * @param {Object} attrs additional attributes for the script
     */
    insertScriptBefore: function (srcAttr, attrs) {
      if (!srcAttr) return;
      var scriptEle   = document.createElement('script');
      scriptEle.type  = 'text/javascript';
      scriptEle.async = true;
      for (var name in attrs) if (attrs.hasOwnProperty(name)) scriptEle[name] = attrs[name];
      scriptEle.src   = srcAttr;

      html.parentNode.insertBefore(scriptEle, html);
      insertedSrcs.push(srcAttr);
      return scriptEle;
    },
    isScriptInserted: function (src) {
      // In tests, cannot call Utils' function because of Widget loading is faster than utils
      for (var i = 0; i < insertedSrcs.length; i++) {
        if (insertedSrcs[i] === src) {
          return true
        }
      }
      return false;
    },
    /**
     * Remove script tags containing the specified src
     * @param {String} src the src of the scripts
     */
    removeScript: function(src) {
      if (!src || !instance.tag.isScriptInserted(src)) return;
      insertedSrcs.splice(instance.c('Utils').indexOf(insertedSrcs, src), 1);
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; ++i) {
        var script = scripts[i];
        if (script.getAttribute('src') === src && script.parentNode) script.parentNode.removeChild(script);
      }
    }
  };

  instance.isBackend = function() {
    return instance.tag.getAttribute('backend');
  };
  instance.hasWAP = function() {
    var token = instance.tag.getAttribute('key');
    var forceDisableTokens = {'nNUR6x': true, '_v4hMP': true}
    if (forceDisableTokens[token]) {
      return false
    }

    var htmlTag = document.getElementsByTagName('html')[0]
    return htmlTag && !htmlTag.hasAttribute('wovn-nowap')
  }

  /**
   * Get component
   * @param componentName {String}
   * @returns component
   */
  var getComponent = function (componentName) {
    // Not use hasOwnProperty to speed up
    var component = installedComponents[componentName];
    if (component)
      return component;
    else if (components[componentName]) {
      installComponent(componentName);
      return installedComponents[componentName];
    }
    else {
      return null;
    }
  };

  var installComponent = function (componentName) {
    if (installedComponents[componentName] || typeof(components[componentName]) === 'undefined')
      return;

    if (typeof components[componentName] === 'function') {
      installedComponents[componentName] = new components[componentName](instance);
    }
    else {
      installedComponents[componentName] = components[componentName];
    }
  };

  instance.c = function (componentName) {
    return getComponent(componentName);
  };

  instance.isComponentLoaded = function (componentName) {
    return installedComponents.hasOwnProperty(componentName) || components.hasOwnProperty(componentName);
  };

  /**
   * Get components src
   *
   * @param {String} componentName
   * @param {Object} options
   * @param {String} options.location alternative of current location
   * @param {Boolean} options.failover if true, return URL for failover
   *
   * @return {String} src
   */
  var componentSrc = function(componentName, options) {
    if (!options) options = {};

    if (!instance.isTest) {
      if (componentName === 'Data') {
        var key = instance.tag.getAttribute('key');
        if (!key) return null;
        if (!instance.c('Utils').isValidURI(options['location'])) return null;
        var encodedLocation = getEncodedLocation(options['location']);
        var path = '/js_data/1/'+ key + '/?u=' + encodedLocation + '&version=1';
        var host_with_scheme = options.failover ? instance.c('RailsBridge')['cdnOriginHost'] : instance.c('RailsBridge')['requestWidgetHost'];
        return host_with_scheme + path;
      }
    }

    var componentPath = instance.c('RailsBridge')['jWovnHost'] + '1/components/'
    return options.failover ? null : (componentPath + componentName);
  };

  /**
   * Get data src
   *
   * @param {Object} options
   * @param {String} options.location alternative of current location
   * @param {Boolean} options.failover if true, return URL for failover
   *
   * @return {String} src
   */
  var dataJsonSrc = function(options) {
    if (!options) options = {};
    var key = instance.tag.getAttribute('key');
    if (!key) return null;
    if (!instance.c('Utils').isValidURI(options['location'])) return null;
    var encodedLocation = getEncodedLocation(options['location']);
    var path = '/js_data/json/1/'+ key + '/?u=' + encodedLocation + '&version=1';
    if (instance.isTest) {
      path += '&test=true';
    }
    var host = options.failover ? instance.c('RailsBridge')['cdnOriginHost'] : instance.c('RailsBridge')['requestWidgetHost'];
    return host + path;
  };

  var liveEditorSavedDataJsonSrc = function() {
    var token = instance.tag.getAttribute('key');
    var session = encodeURIComponent(instance.c('Url').getLiveEditorSession())
    if (!token || !session) {
      return null;
    }

    var encodedLocation = getEncodedLocation(options['location']);
    var host = instance.c('Url').getApiHost();
    var url = host + 'in_page/saved_json_data/' + token + '?session_token=' + session + '&u=' + encodedLocation;
    return url;
  }

  var previewDataJsonSrc = function(signature) {
    var token = instance.tag.getAttribute('key');
    var encodedLocation = getEncodedLocation(options['location']);
    var host = instance.c('Url').getApiHost();
    var url = host + 'js_preview_data/' + token + '?signature=' + encodeURIComponent(signature) + '&u=' + encodedLocation;
    return url;
  }

  var addLoadListener = function(componentName, callback) {
    var loadEvent = document.createEvent('Event');
    var eventName = componentName + 'Loaded';
    loadEvent.initEvent(eventName, true, true);
    if (document.addEventListener) {
      var handler = function() {
        document.removeEventListener(eventName, handler, false);
        callback.apply(this, arguments);
      };
      document.addEventListener(eventName, handler, false);
    } else if (document.attachEvent) {
      var handler = function() {
        document.detachEvent(eventName, handler);
        callback.apply(this, arguments);
      };
      document.attachEvent(eventName, handler);
    }
  };

  /**
   * Load a component
   *
   * @param {String} componentName
   * @param {Object} options
   * @param {Boolean} options.force if true, insert a script tag always
   * @param {Function} callback
   */
  instance.loadComponent = function (componentName, options, callback) {
    if (callback === undefined && typeof(options) === 'function') {
      callback = options;
      options = {};
    }
    options = options || {};

    if (typeof(callback) !== 'function') callback = function () {};

    // if this component is already loaded, call callback and return
    if (!options['force'] && instance.isComponentLoaded(componentName)) {
      setTimeout(callback, 0);
      return;
    }

    // setup load event
    var loaded = false;
    addLoadListener(componentName, function() {
      if (loaded) return;
      loaded = true;
      callback.apply(this, arguments);
    });

    var retried = false;
    var load = function() {
      var src = componentSrc(componentName, options);
      if (options['force'] || !instance.tag.isScriptInserted(src)) {
        var retry = function() {
          if (loaded || retried) return;
          retried = true;
          options.failover = true;
          load();
        };
        var attrs = {}
        // retry if the CDN returns an error.
        attrs.onerror = retry;
        attrs.onreadystatechange = function() {
          if (this.readyState === 'loaded' || this.readyState === 'complete') retry();
        };
        // retry if loading is timed out.
        setTimeout(retry, DATA_TIMEOUT);
      }
      instance.tag.insertScriptBefore(src, attrs);
    }
    load();
  };

  /**
   * Load data as JSON
   * @param {Function} callback
   */
  instance.loadDataJson = function(callback) {
    var src = dataJsonSrc();

    instance.c('Utils').sendRequestAsJson('GET', src, callback, errorFailover);

    function errorFailover(reason) {
      // Ignore 204 response (page doesn't exist or isn't published).
      if (reason && reason.status === 204) {
        return;
      }
      var src = dataJsonSrc({failover: true});
      instance.c('Utils').sendRequestAsJson('GET', src, callback, function() {})
    }
  };

  instance.loadLiveEditorSavedData = function(callback, errorCallback) {
    var src = liveEditorSavedDataJsonSrc();
    instance.c('Utils').sendRequestAsJson('GET', src, callback, errorCallback)
  };

  instance.loadPreviewData = function(signature, callback, errorCallback) {
    var src = previewDataJsonSrc(signature);
    instance.c('Utils').sendRequestAsJson('GET', src, callback, errorCallback)
  };

  instance.loadComponents = function(componentNames, callbacks) {
    var newComponentNames = [];
    for (var i = 0; i < componentNames.length; ++i) {
      var componentName = componentNames[i];
      var callback = callbacks[componentName] || function() {};
      if (instance.isComponentLoaded(componentName)) {
        setTimeout(callback, 0);
      } else {
        addLoadListener(componentName, callback);
        newComponentNames.push(componentName);
      }
    }
    if (newComponentNames.length) instance.tag.insertScriptBefore(componentSrc(newComponentNames.join('+')));
  };

  /**
   * Load domain's option
   * @param {Function} callback called when succeed
   * @param {Function} errorCallback called when fail
   */
  instance.loadDomainOption = function(callback, errorCallback) {
    var key = instance.tag.getAttribute('key');
    if (!key) return;
    var retried = false;
    var loaded = false;
    var onsuccess = function(data, headers) {
      if (loaded) return;
      loaded = true;

      // Convert data to another format, only when in dev mode
      data = instance.c('Utils').convertCssStyles(data)

      // In IE9, cannot access custom headers using XDomainRequest...
      var countryCode = null;
      if (headers) {
        // some browser need to access header by lowercase.
        var headerNames = ['Country-Code', 'country-code'];
        for (var i = 0; i < headerNames.length; i++) {
          var headerName = headerNames[i];
          if (headers[headerName]) {
            countryCode = headers[headerName];
            break;
          }
        }
        if (countryCode) {
          data['countryCode'] = countryCode;
        }
      }

      if (!countryCode && instance.c('Data').needsCountryCode(data)) {
        instance.loadCountryCode(function(jsonData) {
          if (jsonData && jsonData['countryCode']) {
            data['countryCode'] = jsonData['countryCode'];
          }
          callback(data);
        }, function() {})
        return
      }

      callback(data);
    };
    var onerror = function() {
      if (loaded) return;
      if (retried) {
        errorCallback.apply(this, arguments);
      } else {
        retried = true;
        load(instance.c('RailsBridge')['cdnOriginHost']);
      }
    };
    var load = function(host) {
        var puny_host = instance.c('PunyCode').toASCII(getRealLocation().hostname)
        var option_url = host + '/domain/options/' + key + '?v=20180414&host=' + puny_host;
        instance.c('Utils').sendRequestAsJson('GET', option_url, onsuccess, onerror);
    };
    load(instance.c('RailsBridge')['requestWidgetHost']);
    setTimeout(onerror, DATA_TIMEOUT);
  };

  instance.loadCountryCode = function(callback, errorCallback) {
    var loaded = false;
    var onsuccess = function() {
      loaded = true;
      callback.apply(this, arguments);
    };
    var onerror = function() {
      if (loaded) return;
      errorCallback.apply(this, arguments);
    };
    // Request must not go to CDN server
    var option_url = instance.c('RailsBridge')['cdnOriginHost'] + '/inspect/country';
    instance.c('Utils').sendRequestAsJson('GET', option_url, onsuccess, onerror);
    setTimeout(onerror, DATA_TIMEOUT);
  };

  /**
   * Get translated values
   * @param values {Array<String>} original values
   * @param callback
   * @param errorCallback
   */
  instance.loadTranslation = function(values, callback, errorCallback) {
    if (isDisableLoadTranslation) { return; }
    var defaultCode = instance.c('Lang').getDefaultCodeIfExists();
    // Must not be called before load page.
    if (!defaultCode) return;

    var key = instance.tag.getAttribute('key');
    if (!key) return;
    var url = instance.c('RailsBridge')['apiHost'] + 'values/translate';
    var data = {
      srcs: values,
      defaultLang: defaultCode,
      token: key,
      host: getRealLocation().hostname
    }
    instance.c('Utils').postJsonRequest(url, data, callback, errorCallback);
  }

  instance.disableLoadTranslation = function() {
    isDisableLoadTranslation = true
  }

  instance.clearCacheData = function() {
    cachedData = []
  }

  instance.reloadData = function(callback) {
    var encodedLocation = getEncodedLocation();
    var cache = null;
    for (var i = 0; i < cachedData.length; ++i) {
      if (cachedData[i].encodedLocation === encodedLocation) {
        cache = cachedData[i];
        break;
      }
    }
    if (cache) {
      callback(cache.data);
    } else {
      instance.c('Interface').loadData(function(data) {
        cachedData.unshift({encodedLocation: encodedLocation, data: data});

        // To not use much memory.
        if (cachedData.length > 50) cachedData.pop();

        callback(data);
      });
    }
  };

  instance.removeComponentScript = function(componentName, options) {
    instance.tag.removeScript(componentSrc(componentName, options));
  };

  var destroyComponent = function(componentName) {
    if (typeof(installedComponents[componentName].destroy) === 'function') {
      installedComponents[componentName].destroy();
    }
  };

  instance.destroy = function () {
    for (componentName in installedComponents){
      if (installedComponents.hasOwnProperty(componentName)) destroyComponent(componentName);
    }
  };

  instance.reinstallComponent = function(componentName) {
    destroyComponent(componentName);
    installedComponents[componentName] = new components[componentName](instance);
  };

  instance.getBackendCurrentLang = function () {
    return instance.tag.getAttribute('currentLang');
  }

  /**
   * In the Shopify page, the token is obtained using a shop query.
   * Do not use tokens until you have successfully obtained it.
   */
  instance.getTokenFromShop = function (callback) {
    var shopRegex = new RegExp('shop=([^&]*)', 'i');
    var shopMatch = instance.tag.getAttribute('src').match(shopRegex);
    if (shopMatch && shopMatch[1]) {
      var shop = shopMatch[1]
      var url = instance.c('RailsBridge')['cdnOriginHost'] + '/shopify/token?shop=' + shop;
      var onsuccess = function (data) {
        if (data['token']) {
          var token = data['token']
          instance.tag.html.setAttribute('data-wovnio', 'key='+ token);
          callback();
        }
      }
      var onerror = function () { }
      instance.c('Utils').sendRequestAsJson('GET', url, onsuccess, onerror);
    }
  }

  /**
   * Gets the current location of the browser without the backend-inserted lang code
   *
   * @return {string} The unicode-safe location of this browser without the lang code
   */
  function getEncodedLocation (currentLocation) {
    // not all browsers handle unicode characters in the path the same, so we have this long mess to handle it
    // TODO: decodeURIcomponent doesnt handle the case where location has char like this: &submit=%8E%9F%82%D6%90i%82%DE (characters encoded in shift_jis)
    // adding unescape before it makes the error go away but doesnt fix the pb and creates pb for utf8 encode params
    if (!currentLocation)
      currentLocation = location;
    if (typeof(currentLocation) !== 'string') {
      var punyHost = instance.c('PunyCode').toASCII(currentLocation.host);
      currentLocation = currentLocation.protocol + '//' + punyHost + currentLocation.pathname + currentLocation.search;
    }

    var urlFormatter = instance.c('UrlFormatter').createFromUrl(currentLocation);
    currentLocation = urlFormatter.getNormalizedPageUrl(instance.tag.getAttribute('backend'), instance.tag.getAttribute('urlPattern'));
    return encodeURIComponent(currentLocation);
  }
  instance.getEncodedLocation = getEncodedLocation;

  /**
   * Gets the current location Object of the browser without the backend-inserted lang code
   *
   * @return {object} An object imitating the location, without the backend inserted lang code
   */
  function getRealLocation (currentLocation) {
    var fakeLocation = currentLocation || location;
    currentLocation = {}
    currentLocation.protocol = fakeLocation.protocol;
    currentLocation.search = fakeLocation.search;
    currentLocation.href = fakeLocation.href;
    currentLocation.host = fakeLocation.host;
    currentLocation.port = fakeLocation.port;
    currentLocation.hostname = fakeLocation.hostname;
    currentLocation.origin = fakeLocation.origin;
    currentLocation.pathname = fakeLocation.pathname;

    if (instance.tag.getAttribute('backend')) {
      var langIdentifier = instance.c('Lang').getBackendLangIdentifier();
      switch (instance.tag.getAttribute('urlPattern')) {
        case 'query':
          currentLocation.search = currentLocation.search.replace(new RegExp('(\\?|&)wovn=' + langIdentifier + '(&|$)'), '$1').replace(/(\?|&)$/, '');
          currentLocation.href = currentLocation.href.replace(new RegExp('(\\?|&)wovn=' + langIdentifier + '(&|$)'), '$1').replace(/(\?|&)$/, '');
          break;
        case 'subdomain':
          currentLocation.host = currentLocation.host.replace(new RegExp('^' + langIdentifier + '\\.', 'i'), '');
          currentLocation.hostname = currentLocation.hostname.replace(new RegExp('^' + langIdentifier + '\\.', 'i'), '');
          currentLocation.href = currentLocation.href.replace(new RegExp('//' + langIdentifier + '\\.', 'i'), '//');
          currentLocation.origin = currentLocation.origin.replace(new RegExp('//' + langIdentifier + '\\.', 'i'), '//');
          break;
        case 'custom_domain':
          var customDomainLanguages = instance.c('CustomDomainLanguages');
          currentLocation.host = customDomainLanguages.removeLanguageFromUrlHost(currentLocation.host, langIdentifier);
          currentLocation.hostname = customDomainLanguages.removeLanguageFromUrlHost(currentLocation.hostname, langIdentifier);
          currentLocation.href = customDomainLanguages.removeLanguageFromAbsoluteUrl(currentLocation.href, langIdentifier);
          currentLocation.origin = customDomainLanguages.removeLanguageFromAbsoluteUrl(currentLocation.origin, langIdentifier);
          break;
        case 'path':
          currentLocation.href = currentLocation.href.replace(new RegExp('(//[^/]+)/' + langIdentifier + '(/|$)'), '$1/');
          currentLocation.pathname = currentLocation.pathname.replace(new RegExp('/' + langIdentifier + '(/|$)'), '/');
      }
    }
    return currentLocation;
  }
  instance.getRealLocation = getRealLocation;

  /**
   * For some reason, perhaps only during tests, widget is initialize more than
   * once, causing `Widget.ts` to be out of sync with the current widget
   * instance.
   */
  if (window.WOVN && WOVN.io && WOVN.io._private) {
    WOVN.io._private.widget = instance;
  }

  return instance;

};

var widget = Widget(components);

// old widget compatibility
document.appendM17nJs = function (res) {
  var components = {};
  components['Data'] = function (widget) {
    var that = this;
    var data = res;

    this.get = function () {
      return data;
    };

    this.set = function (setData) {
      data = setData;
    };

    this.getLang = function () {
      return data['language'];
    };

    this.getUserId = function () {
      return data['user_id'];
    };

    this.getPageId = function () {
      return data['id'];
    };

    this.getPublishedLangs = function () {
      return data['published_langs'];
    };

    this.getOptions = function () {
      return data['widgetOptions'];
    };

    this.dynamicValues = function () {
      return data['dynamic_values'] || (that.getOptions() || {})['dynamic_values'] || false;
    };

  };

  for (var componentName in components){if(components.hasOwnProperty(componentName)) {
    document.WOVNIO.registerComponent(componentName, components[componentName]);
  }}
};


/**
 * After all components migrated to typescript, this component will be the
 * only place to contain variables from Rails
 */
if (typeof(components) === 'undefined') var components = {};
components['RailsBridge'] = function () {
  return {
    langHash: {"ar":{"name":"العربية","code":"ar","en":"Arabic","use_word_boundary":false,"unit_type":"word"},"eu":{"name":"Euskara","code":"eu","en":"Basque","use_word_boundary":true,"unit_type":"word"},"bn":{"name":"বাংলা ভাষা","code":"bn","en":"Bengali","use_word_boundary":true,"unit_type":"word"},"bg":{"name":"Български","code":"bg","en":"Bulgarian","use_word_boundary":true,"unit_type":"word"},"ca":{"name":"Català","code":"ca","en":"Catalan","use_word_boundary":true,"unit_type":"word"},"zh-CHS":{"name":"简体中文","code":"zh-CHS","en":"Simp Chinese","use_word_boundary":false,"unit_type":"character"},"zh-CHT":{"name":"繁體中文","code":"zh-CHT","en":"Trad Chinese","use_word_boundary":false,"unit_type":"character"},"da":{"name":"Dansk","code":"da","en":"Danish","use_word_boundary":true,"unit_type":"word"},"nl":{"name":"Nederlands","code":"nl","en":"Dutch","use_word_boundary":true,"unit_type":"word"},"en":{"name":"English","code":"en","en":"English","use_word_boundary":true,"unit_type":"word"},"fi":{"name":"Suomi","code":"fi","en":"Finnish","use_word_boundary":true,"unit_type":"word"},"fr":{"name":"Français","code":"fr","en":"French","use_word_boundary":true,"unit_type":"word"},"gl":{"name":"Galego","code":"gl","en":"Galician","use_word_boundary":true,"unit_type":"word"},"de":{"name":"Deutsch","code":"de","en":"German","use_word_boundary":true,"unit_type":"word"},"el":{"name":"Ελληνικά","code":"el","en":"Greek","use_word_boundary":true,"unit_type":"word"},"he":{"name":"עברית","code":"he","en":"Hebrew","use_word_boundary":true,"unit_type":"word"},"hu":{"name":"Magyar","code":"hu","en":"Hungarian","use_word_boundary":true,"unit_type":"word"},"id":{"name":"Bahasa Indonesia","code":"id","en":"Indonesian","use_word_boundary":true,"unit_type":"word"},"it":{"name":"Italiano","code":"it","en":"Italian","use_word_boundary":true,"unit_type":"word"},"ja":{"name":"日本語","code":"ja","en":"Japanese","use_word_boundary":false,"unit_type":"character"},"ko":{"name":"한국어","code":"ko","en":"Korean","use_word_boundary":false,"unit_type":"character"},"lv":{"name":"Latviešu","code":"lv","en":"Latvian","use_word_boundary":true,"unit_type":"word"},"ms":{"name":"Bahasa Melayu","code":"ms","en":"Malay","use_word_boundary":true,"unit_type":"word"},"my":{"name":"ဗမာစာ","code":"my","en":"Burmese","use_word_boundary":true,"unit_type":"word"},"ne":{"name":"नेपाली भाषा","code":"ne","en":"Nepali","use_word_boundary":true,"unit_type":"word"},"no":{"name":"Norsk","code":"no","en":"Norwegian","use_word_boundary":true,"unit_type":"word"},"fa":{"name":"زبان_فارسی","code":"fa","en":"Persian","use_word_boundary":true,"unit_type":"word"},"pl":{"name":"Polski","code":"pl","en":"Polish","use_word_boundary":true,"unit_type":"word"},"pt":{"name":"Português","code":"pt","en":"Portuguese","use_word_boundary":true,"unit_type":"word"},"ru":{"name":"Русский","code":"ru","en":"Russian","use_word_boundary":true,"unit_type":"word"},"es":{"name":"Español","code":"es","en":"Spanish","use_word_boundary":true,"unit_type":"word"},"sw":{"name":"Kiswahili","code":"sw","en":"Swahili","use_word_boundary":true,"unit_type":"word"},"sv":{"name":"Svensk","code":"sv","en":"Swedish","use_word_boundary":true,"unit_type":"word"},"tl":{"name":"Tagalog","code":"tl","en":"Tagalog","use_word_boundary":true,"unit_type":"word"},"th":{"name":"ภาษาไทย","code":"th","en":"Thai","use_word_boundary":false,"unit_type":"character"},"hi":{"name":"हिन्दी","code":"hi","en":"Hindi","use_word_boundary":true,"unit_type":"word"},"tr":{"name":"Türkçe","code":"tr","en":"Turkish","use_word_boundary":true,"unit_type":"word"},"uk":{"name":"Українська","code":"uk","en":"Ukrainian","use_word_boundary":true,"unit_type":"word"},"ur":{"name":"اردو","code":"ur","en":"Urdu","use_word_boundary":false,"unit_type":"word"},"vi":{"name":"Tiếng Việt","code":"vi","en":"Vietnamese","use_word_boundary":true,"unit_type":"word"}},
    domainCssStyles: {"style":{"default":{"position":{"bottom_left":"#wovn-translate-widget[wovn] {\n  bottom: 20px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border-radius: 0 5px 5px 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  bottom: 34px;\n  left: 8px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  bottom: 44px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container {\n  bottom: 46px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container.is-open {\n  bottom: 56px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  width: 100%;\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 12px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open {\n  bottom: 44px;\n}","bottom_right":"#wovn-translate-widget[wovn] {\n  bottom: 20px;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border-radius: 5px 0 0 5px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  bottom: 34px;\n  left: 8px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  bottom: 44px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container {\n  bottom: 46px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container.is-open {\n  bottom: 56px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  width: 100%;\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 12px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open {\n  bottom: 44px;\n}","top_left":"#wovn-translate-widget[wovn] {\n  top: 20px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border-radius: 0 5px 5px 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  top: 34px;\n  left: 8px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  top: 44px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  width: 100%;\n  bottom: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 12px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open {\n  bottom: 44px;\n}","top_right":"#wovn-translate-widget[wovn] {\n  top: 20px;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border-radius: 5px 0 0 5px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  top: 34px;\n  left: 8px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  top: 44px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  width: 100%;\n  bottom: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 12px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open {\n  bottom: 44px;\n}"},"form":"#wovn-translate-widget[wovn] {\n  box-sizing: border-box;\n  z-index: 9999999999;\n  border-radius: 5px;\n  text-align: left;\n  position: fixed;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-sizing: border-box;\n  position: relative;\n  cursor: pointer;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  box-sizing: border-box;\n  position: relative;\n  cursor: pointer;\n  line-height: 0;\n  display: block;\n  padding: 8px;\n  width: 100%;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  box-sizing: border-box;\n  vertical-align: middle;\n  display: inline-block;\n  position: relative;\n  border-radius: 3px;\n  font-weight: 500;\n  padding: 6px 8px;\n  min-width: 146px;\n  min-height: 32px;\n  cursor: pointer;\n  font-size: 12px;\n  z-index: 1;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  position: absolute;\n  height: 20px;\n  width: 20px;\n  left: 16px;\n  z-index: 2;\n  top: 14px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links #wovn-logo-planet + .wovn-current-lang {\n  padding: 6px 8px 6px 32px;\n  line-height: 1.5;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  vertical-align: middle;\n  display: inline-block;\n  position: absolute;\n  margin: -4px 0 0;\n  line-height: 0;\n  height: 8px;\n  width: 12px;\n  right: 8px;\n  top: 50%;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  vertical-align: middle;\n  display: inline-block;\n  text-align: center;\n  position: relative;\n  cursor: pointer;\n  line-height: 0;\n  height: 9px;\n  width: auto;\n  z-index: 2;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small #wovn-logo--default {\n  margin: 0 0 0 8px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small #wovn-logo--floating {\n  display: none;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector #translated-by-machine {\n  border-radius: 0 0 5px 5px;\n  box-sizing: border-box;\n  position: relative;\n  text-align: left;\n  line-height: 3px;\n  font-weight: 500;\n  cursor: pointer;\n  font-size: 9px;\n  padding: 0 8px;\n  display: none;\n  height: 12px;\n  width: 100%;\n  z-index: 3;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  -webkit-transition: all .25s linear;\n  -moz-transition: all .25s linear;\n  -o-transition: all .25s linear;\n  transition: all .25s linear;\n\n  pointer-events: none;\n  border-radius: 5px;\n  position: absolute;\n  overflow: hidden;\n  opacity: 0;\n  z-index: 9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list {\n  box-sizing: border-box;\n  max-height: 300px;\n  min-width: 146px;\n  overflow: hidden;\n  overflow-y: scroll;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  -webkit-transition: all 0.2s linear;\n  -moz-transition: all 0.2s linear;\n  -o-transition: all 0.2s linear;\n  transition: all 0.2s linear;\n\n  padding: 16px 16px 16px 28px;\n  position: relative;\n  font-weight: 500;\n  font-size: 12px;\n  cursor: pointer;\n  line-height: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  top: calc(50% - 4px);\n  border-radius: 50%;\n  position: absolute;\n  content: '';\n  height: 8px;\n  width: 8px;\n  left: 12px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  display: none;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  pointer-events: auto;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg {\n  height: 8px;\n  width: 56px;\n}\n\n","colors":{"default_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #f6f8fa;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid #dee5ec;\n  background-color: #ffffff;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjNTQ1RjY2IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMjMuMDc4IDE4LjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDEyNiAyMS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEyMCAtMTcpIi8+Cjwvc3ZnPgo=');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(84, 95, 102, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #f6f8fa;\n  color: #82959f;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: #c5cfda;\n}","default":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #f6f8fa;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid #dee5ec;\n  background-color: #ffffff;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjNTQ1RjY2IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMjMuMDc4IDE4LjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDEyNiAyMS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEyMCAtMTcpIi8+Cjwvc3ZnPgo=');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(84, 95, 102, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #f6f8fa;\n  color: #82959f;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: #c5cfda;\n}","gray_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid #545f66;\n  background-color: #394045;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICAgIDxwYXRoIGZpbGw9IiM3NjdGODUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTExNS4wNzggMTIuMTg1YS42MzIuNjMyIDAgMSAwLS44OTMuODkzbDMuMzY5IDMuMzY5YS42MzIuNjMyIDAgMCAwIC44OTMgMGwzLjM2OC0zLjM2OWEuNjMyLjYzMiAwIDEgMC0uODkzLS44OTNMMTE4IDE1LjEwN2wtMi45MjItMi45MjJ6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTEyIC0xMSkiLz4KPC9zdmc+');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #394045;\n  color: #bdc4c8;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","gray":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid #545f66;\n  background-color: #394045;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICAgIDxwYXRoIGZpbGw9IiM3NjdGODUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTExNS4wNzggMTIuMTg1YS42MzIuNjMyIDAgMSAwLS44OTMuODkzbDMuMzY5IDMuMzY5YS42MzIuNjMyIDAgMCAwIC44OTMgMGwzLjM2OC0zLjM2OWEuNjMyLjYzMiAwIDEgMC0uODkzLS44OTNMMTE4IDE1LjEwN2wtMi45MjItMi45MjJ6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTEyIC0xMSkiLz4KPC9zdmc+');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #394045;\n  color: #bdc4c8;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","red_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #ed8076;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ed8076;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","red":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #ed8076;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ed8076;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","orange_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #ffad60;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ffad60;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","orange":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #ffad60;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ffad60;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","green_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #40b87c;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #40b87c;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","green":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #40b87c;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #40b87c;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","blue_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #52b0e9;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #52b0e9;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","blue":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #52b0e9;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #52b0e9;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","deepblue_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #6b82e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #6b82e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","deepblue":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #6b82e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #6b82e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","purple_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #ae84e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ae84e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","purple":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  border: 1px solid rgba(255, 255, 255, 0.2);\n  background-color: #ae84e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 1px rgba(0, 0, 0, 0.1);\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ae84e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}"}},"floating":{"position":{"bottom_right":"#wovn-translate-widget[wovn] {\n  bottom: 16px;\n  right: 16px;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  transform-origin: right bottom;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  bottom: 0;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: 8px;\n  right: 8px;\n  opacity: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 8px;\n  right: 8px;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: 4px;\n  right: 4px;\n  opacity: 0;\n}\n","bottom_left":"#wovn-translate-widget[wovn] {\n  bottom: 16px;\n  left: 16px;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  transform-origin: left bottom;\n  bottom: 0;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: 8px;\n  right: 8px;\n  opacity: 0;\n  left: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  transform-origin: right bottom;\n  left: auto;\n  bottom: 0;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 8px;\n  right: 8px;\n  opacity: 1;\n  left: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: 4px;\n  right: 4px;\n  opacity: 0;\n  left: auto;\n}","top_left":"#wovn-translate-widget[wovn] {\n  top: 16px;\n  left: 16px;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  transform-origin: left top;\n  left: 0;\n  top: 0;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: 8px;\n  right: 8px;\n  opacity: 0;\n  left: auto;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  transform-origin: right bottom;\n  left: auto;\n  top: auto;\n  bottom: 0;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 8px;\n  right: 8px;\n  opacity: 1;\n  left: auto;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: 4px;\n  right: 4px;\n  opacity: 0;\n  left: auto;\n  top: auto;\n}","top_right":"#wovn-translate-widget[wovn] {\n  top: 16px;\n  right: 16px;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  transform-origin: right top;\n  right: 0;\n  top: 0;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: 8px;\n  right: 8px;\n  opacity: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  transform-origin: right bottom;\n  bottom: 0;\n  top: auto;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 300ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  bottom: 8px;\n  right: 8px;\n  opacity: 1;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 300ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  bottom: 4px;\n  right: 4px;\n  opacity: 0;\n  top: auto;\n}\n"},"form":"#wovn-translate-widget[wovn] {\n  box-sizing: border-box;\n  z-index: 9999999999;\n  border-radius: 5px;\n  text-align: left;\n  position: fixed;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  -webkit-transition: all 0.25s ease-out 0.2s;\n  -moz-transition: all 0.25s ease-out 0.2s;\n  -o-transition: all 0.25s ease-out 0.2s;\n  transition: all 0.25s ease-out 0.2s;\n\n  box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.08), 0 1px 2px 0 rgba(0, 0, 0, 0.1);\n  box-sizing: border-box;\n  border-radius: 5px;\n  position: relative;\n  cursor: pointer;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  padding: 8px 32px 8px 8px;\n  box-sizing: border-box;\n  position: relative;\n  cursor: pointer;\n  line-height: 0;\n  display: block;\n  width: 100%;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  position: absolute;\n  height: 20px;\n  width: 20px;\n  z-index: 2;\n  left: 8px;\n  top: 7px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container + .wovn-lang-selector .wovn-lang-selector-links {\n  padding: 9px 32px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  display: inline-block;\n  position: relative;\n  font-weight: 600;\n  cursor: pointer;\n  font-size: 12px;\n  z-index: 1;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  pointer-events: none;\n  text-align: center;\n  position: absolute;\n  margin-top: -5px;\n  cursor: pointer;\n  line-height: 0;\n  display: block;\n  height: 9px;\n  width: auto;\n  z-index: 2;\n  opacity: 1;\n  right: 8px;\n  top: 50%;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small #wovn-logo--floating {\n  height: 10px;\n  width: 21px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small #wovn-logo--default {\n  display: none;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector #translated-by-machine {\n  border-radius: 0 0 5px 5px;\n  box-sizing: border-box;\n  text-align: center;\n  position: relative;\n  line-height: 16px;\n  font-weight: 500;\n  cursor: pointer;\n  font-size: 9px;\n  padding: 0 8px;\n  display: none;\n  height: 16px;\n  width: 100%;\n  z-index: 3;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  -webkit-transition: all 0.25s cubic-bezier(0.030, 0.630, 0.355, 1);\n  -moz-transition: all 0.25s cubic-bezier(0.030, 0.630, 0.355, 1);\n  -o-transition: all 0.25s cubic-bezier(0.030, 0.630, 0.355, 1);\n  transition: all 0.25s cubic-bezier(0.030, 0.630, 0.355, 1);\n  -webkit-transform: scale(0);\n  -moz-transform: scale(0);\n  -o-transform: scale(0);\n  transform: scale(0);\n\n  pointer-events: none;\n  border-radius: 5px;\n  position: absolute;\n  overflow: hidden;\n  opacity: 0;\n  z-index: 9;\n\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list {\n  max-height: 300px;\n  min-width: 108px;\n  overflow: hidden;\n  overflow-y: scroll;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  -webkit-transition: all 0.2s linear;\n  -moz-transition: all 0.2s linear;\n  -o-transition: all 0.2s linear;\n  transition: all 0.2s linear;\n\n  position: relative;\n  padding: 10px 28px;\n  font-weight: 600;\n  font-size: 12px;\n  cursor: pointer;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  top: calc(50% - 4px);\n  border-radius: 50%;\n  position: absolute;\n  content: '';\n  height: 8px;\n  width: 8px;\n  left: 12px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  box-sizing: border-box;\n  display: inline-block;\n  text-align: center;\n  padding-top: 12px;\n  cursor: pointer;\n  line-height: 1;\n  height: 36px;\n  width: 100%;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  -webkit-animation: bounced 0.25s forwards;\n  -moz-animation: bounced 0.25s forwards;\n  -o-animation: bounced 0.25s forwards;\n  animation: bounced 0.25s forwards;\n\n  pointer-events: auto;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open + .wovn-lang-selector {\n  -webkit-transition: all 0.25s ease-in-out;\n  -moz-transition: all 0.25s ease-in-out;\n  -o-transition: all 0.25s ease-in-out;\n  transition: all 0.25s ease-in-out;\n\n  pointer-events: none;\n  opacity: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg {\n  height: 10px;\n  width: 61px;\n}\n\n@keyframes bounced {\n  0% {\n    transform: scale(0);\n  }\n  85% {\n    transform: scale(1.02);\n  }\n  100% {\n    transform: scale(1);\n  }\n}\n\n@-webkit-keyframes bounced {\n  0% {\n    -webkit-transform: scale(0);\n  }\n  85% {\n    -webkit-transform: scale(1.02);\n  }\n  100% {\n    -webkit-transform: scale(1);\n  }\n}\n\n@-moz-keyframes bounced {\n  0% {\n    -moz-transform: scale(0);\n  }\n  85% {\n    -moz-transform: scale(1.02);\n  }\n  100% {\n    -moz-transform: scale(1);\n  }\n}\n\n@-o-keyframes bounced {\n  0% {\n    -o-transform: scale(0);\n  }\n  85% {\n    -o-transform: scale(1.02);\n  }\n  100% {\n    -o-transform: scale(1);\n  }\n}","colors":{"default_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #82959f;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #eef3f7;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid #eef3f7;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: #c5cfda;\n}","default":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #82959f;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #eef3f7;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid #eef3f7;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: #c5cfda;\n}","gray_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #8f9aa0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #282c30;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #282c30;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #545f66;\n  color: #bdc4c8;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(246, 248, 250, 0.1);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","gray":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #8f9aa0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #282c30;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #282c30;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #545f66;\n  color: #bdc4c8;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(246, 248, 250, 0.1);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","red_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #e96f66;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","red":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #e96f66;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","orange_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ff9f50;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","orange":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ffad60;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #ff9f50;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","green_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #32a862;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","green":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #32a862;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","blue_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #44a2e3;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","blue":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #44a2e3;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","deepblue_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #5e75e1;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","deepblue":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #5e75e1;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","purple_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #a073e0;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","purple":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #a073e0;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","custom_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #812990;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #812990;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #6D227A;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #6D227A;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #6D227A;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small.wovn-logo--custom {\n  display: block!important;\n  height: 21px;\n  top: 10px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small.wovn-logo--custom #wovn-logo--floating.wovn-logo--floating--custom {\n  cursor: normal;\n  height: 21px;\n  width: 21px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  padding: 8px 32px 8px 8px!important;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}\n","custom":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  background-color: #812990;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.2);\n  background-color: #812990;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #6D227A;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #6D227A;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #6D227A;\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  border-top: 1px solid rgba(255, 255, 255, 0.2);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small.wovn-logo--custom {\n  display: block!important;\n  height: 21px;\n  top: 10px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small.wovn-logo--custom #wovn-logo--floating.wovn-logo--floating--custom {\n  cursor: normal;\n  height: 21px;\n  width: 21px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  padding: 8px 32px 8px 8px!important;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}\n"}},"slate":{"position":{"bottom_left":"#wovn-translate-widget[wovn] {\n  bottom: 20px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border-bottom: none!important;\n  bottom: 46px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container {\n  bottom: 26px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container {\n  bottom: 42px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container {\n  bottom: 65px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  bottom: 56px;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container.is-open {\n  bottom: 36px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container.is-open {\n  bottom: 52px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container.is-open {\n  bottom: 75px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  left: -100%;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  left: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  left: -100%;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  width: 100%;\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 11px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open {\n  bottom: 42px;\n}\n\n#wovn-translate-widget[wovn].mobile.hide-logo .wovn-lang-container.is-open {\n  bottom: 42px;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-container.is-open {\n  bottom: 42px;\n}\n\n#wovn-translate-widget[wovn].mobile.hide-logo.show-tbm .wovn-lang-container.is-open {\n  bottom: 42px;\n}","bottom_right":"#wovn-translate-widget[wovn] {\n  bottom: 20px;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border-bottom: none!important;\n  bottom: 46px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container {\n  bottom: 26px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container {\n  bottom: 42px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container {\n  bottom: 65px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  bottom: 56px;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container.is-open {\n  bottom: 36px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container.is-open {\n  bottom: 52px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container.is-open {\n  bottom: 77px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  width: 100%;\n  bottom: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 11px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.hide-logo .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.hide-logo.show-tbm .wovn-lang-container.is-open {\n  bottom: 42px;\n}","top_left":"#wovn-translate-widget[wovn] {\n  top: 20px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border-top: none!important;\n  top: 46px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 23px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  position: absolute!important;\n  top: -23px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  top: 59px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container {\n  top: 65px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 42px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  position: absolute;\n  top: -42px;\n  margin: 0;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector #translated-by-machine {\n  position: absolute;\n  top: 19px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container.is-open {\n  top: 75px;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container.is-open {\n  top: 36px;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 0;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container {\n  border-top: none;\n  top: 26px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container {\n  top: 42px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container.is-open {\n  top: 52px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 16px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-selector #translated-by-machine {\n  position: absolute;\n  top: 0;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n\n  bottom: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n\n  bottom: -48px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  margin-top: 0;\n  width: 100%;\n  bottom: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  top: auto!important;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 11px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.hide-logo .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.hide-logo.show-tbm .wovn-lang-container.is-open {\n  border-bottom: none;\n  bottom: 42px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links,\n#wovn-translate-widget[wovn].mobile.hide-logo .wovn-lang-selector .wovn-lang-selector-links,\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links,\n#wovn-translate-widget[wovn].mobile.hide-logo.show-tbm .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 0;\n}","top_right":"#wovn-translate-widget[wovn] {\n  top: 20px;\n  right: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border-top: none!important;\n  top: 46px;\n  left: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 23px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  position: absolute!important;\n  top: -23px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  top: 59px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container {\n  top: 65px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 42px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  position: absolute;\n  top: -42px;\n  margin: 0;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector #translated-by-machine {\n  position: absolute;\n  top: 19px;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-container.is-open {\n  top: 75px;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container.is-open {\n  top: 36px;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 0;\n}\n\n#wovn-translate-widget[wovn].hide-logo .wovn-lang-container {\n  border-top: none;\n  top: 26px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container {\n  top: 42px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-container.is-open {\n  top: 52px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 16px;\n}\n\n#wovn-translate-widget[wovn].hide-logo.show-tbm .wovn-lang-selector #translated-by-machine {\n  position: absolute;\n  top: 0;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  bottom: -48px;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-in {\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1);\n  -webkit-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -moz-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  -o-transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n  transition: all 400ms cubic-bezier(0.085, 0.415, 0.285, 1.060);\n\n  bottom: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.slide-out {\n  -webkit-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -moz-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  -o-transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n  transition: all 400ms cubic-bezier(0.125, 0.540, 0.450, 0.940);\n\n  bottom: -48px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile {\n  margin-top: 0;\n  width: 100%;\n  bottom: 0;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector {\n  border-radius: 0;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: calc(50% - 4px);\n  position: absolute;\n  line-height: 0;\n  height: 8px;\n  right: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  background-color: transparent;\n  top: auto!important;\n  position: absolute;\n  text-align: right;\n  line-height: 1;\n  bottom: 8px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container {\n  bottom: 34px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  top: 11px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.hide-logo .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-container.is-open,\n#wovn-translate-widget[wovn].mobile.hide-logo.show-tbm .wovn-lang-container.is-open {\n  border-bottom: none;\n  bottom: 42px;\n  top: auto;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links,\n#wovn-translate-widget[wovn].mobile.hide-logo .wovn-lang-selector .wovn-lang-selector-links,\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links,\n#wovn-translate-widget[wovn].mobile.hide-logo.show-tbm .wovn-lang-selector .wovn-lang-selector-links {\n  margin-top: 0;\n}\n"},"form":"#wovn-translate-widget[wovn] {\n  box-sizing: border-box;\n  z-index: 9999999999;\n  text-align: left;\n  position: fixed;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector {\n  box-sizing: border-box;\n  position: relative;\n  cursor: pointer;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  box-sizing: border-box;\n  padding: 0!important;\n  position: relative;\n  cursor: pointer;\n  line-height: 0;\n  display: block;\n  width: 100%;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  box-sizing: border-box;\n  position: relative;\n  min-width: 144px;\n  min-height: 34px;\n  font-weight: 500;\n  line-height: 1.5;\n  cursor: pointer;\n  font-size: 12px;\n  display: block;\n  padding: 8px;\n  z-index: 1;\n  outline: 0;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  position: absolute;\n  height: 20px;\n  width: 20px;\n  z-index: 2;\n  left: 6px;\n  top: 7px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links #wovn-logo-planet + .wovn-current-lang {\n  padding: 8px 8px 8px 32px;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  display: inline-block;\n  padding: 14px 8px;\n  line-height: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  vertical-align: middle;\n  display: inline-block;\n  position: absolute;\n  margin: -4px 0 0;\n  line-height: 0;\n  height: 8px;\n  width: 12px;\n  right: 8px;\n  top: 50%;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  vertical-align: middle;\n  box-sizing: border-box;\n  display: inline-block;\n  text-align: center;\n  position: relative;\n  padding: 6px 0 0;\n  cursor: pointer;\n  line-height: 0;\n  height: 20px;\n  width: 100%;\n  z-index: 2;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn].show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  padding: 10px 0 0;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  height: auto;\n  width: auto;\n  padding: 0;\n  margin: 0;\n}\n\n#wovn-translate-widget[wovn].mobile.show-tbm .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  padding: 0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small #wovn-logo--floating {\n  display: none;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector #translated-by-machine {\n  box-sizing: border-box;\n  position: relative;\n  text-align: center;\n  font-weight: 500;\n  padding: 4px 8px;\n  cursor: pointer;\n  font-size: 9px;\n  display: none;\n  width: 100%;\n  z-index: 3;\n}\n\n#wovn-translate-widget[wovn].mobile .wovn-lang-selector #translated-by-machine {\n  padding: 4px 8px 0;\n  bottom: 6px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  -webkit-transition: all .25s linear;\n  -moz-transition: all .25s linear;\n  -o-transition: all .25s linear;\n  transition: all .25s linear;\n\n  pointer-events: none;\n  position: absolute;\n  max-width: 144px;\n  overflow: hidden;\n  opacity: 0;\n  z-index: 9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list {\n  box-sizing: border-box;\n  min-width: 144px;\n  max-height: 300px;\n  overflow: hidden;\n  overflow-y: scroll;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  -webkit-transition: all 0.2s linear;\n  -moz-transition: all 0.2s linear;\n  -o-transition: all 0.2s linear;\n  transition: all 0.2s linear;\n\n  padding: 14px 16px 14px 28px;\n  position: relative;\n  font-weight: 500;\n  font-size: 12px;\n  cursor: pointer;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  top: calc(50% - 4px);\n  border-radius: 50%;\n  position: absolute;\n  content: '';\n  height: 8px;\n  width: 8px;\n  left: 12px;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo {\n  display: none;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container.is-open {\n  pointer-events: auto;\n  opacity: 1;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg {\n  height: 8px;\n  width: 56px;\n}","colors":{"default_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #dee5ec;\n  background-color: #f6f8fa;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #ffffff;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjNTQ1RjY2IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMjMuMDc4IDE4LjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDEyNiAyMS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEyMCAtMTcpIi8+Cjwvc3ZnPgo=');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #dee5ec;\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(84, 95, 102, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #f6f8fa;\n  color: #82959f;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: #c5cfda;\n}","default":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #dee5ec;\n  background-color: #f6f8fa;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #ffffff;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjNTQ1RjY2IiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMjMuMDc4IDE4LjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDEyNiAyMS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTEyMCAtMTcpIi8+Cjwvc3ZnPgo=');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #dee5ec;\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(84, 95, 102, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #f6f8fa;\n  color: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  background-color: #f6f8fa;\n  color: #82959f;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #545f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: #c5cfda;\n}","gray_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #2b2f32;\n  background-color: #2b2f32;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #394045;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICAgIDxwYXRoIGZpbGw9IiM3NjdGODUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTExNS4wNzggMTIuMTg1YS42MzIuNjMyIDAgMSAwLS44OTMuODkzbDMuMzY5IDMuMzY5YS42MzIuNjMyIDAgMCAwIC44OTMgMGwzLjM2OC0zLjM2OWEuNjMyLjYzMiAwIDEgMC0uODkzLS44OTNMMTE4IDE1LjEwN2wtMi45MjItMi45MjJ6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTEyIC0xMSkiLz4KPC9zdmc+');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #2b2f32;\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #2b2f32;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","gray":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #2b2f32;\n  background-color: #2b2f32;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #394045;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICAgIDxwYXRoIGZpbGw9IiM3NjdGODUiIGZpbGwtcnVsZT0ibm9uemVybyIgZD0iTTExNS4wNzggMTIuMTg1YS42MzIuNjMyIDAgMSAwLS44OTMuODkzbDMuMzY5IDMuMzY5YS42MzIuNjMyIDAgMCAwIC44OTMgMGwzLjM2OC0zLjM2OWEuNjMyLjYzMiAwIDEgMC0uODkzLS44OTNMMTE4IDE1LjEwN2wtMi45MjItMi45MjJ6IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMTEyIC0xMSkiLz4KPC9zdmc+');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #2b2f32;\n  background-color: #394045;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #2b2f32;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #2b2f32;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #38b171;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","red_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #e96f66;\n  background-color: #e96f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #ed8076;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #e96f66;\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #e96f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","red":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #e96f66;\n  background-color: #e96f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #ed8076;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #e96f66;\n  background-color: #ed8076;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #e96f66;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #e96f66;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","orange_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #ff9f50;\n  background-color: #ff9f50;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #f9b65b;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #ff9f50;\n  background-color: #f9b65b;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #ff9f50;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","orange":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #ff9f50;\n  background-color: #ff9f50;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #f9b65b;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #ff9f50;\n  background-color: #f9b65b;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #ff9f50;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #ff9f50;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","green_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #32a862;\n  background-color: #32a862;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #40b87c;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #32a862;\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #32a862;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","green":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #32a862;\n  background-color: #32a862;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #40b87c;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #32a862;\n  background-color: #40b87c;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #32a862;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #32a862;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","blue_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #44a2e3;\n  background-color: #44a2e3;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #52b0e9;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #44a2e3;\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #44a2e3;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","blue":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #44a2e3;\n  background-color: #44a2e3;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #52b0e9;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #44a2e3;\n  background-color: #52b0e9;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #44a2e3;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #44a2e3;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","deepblue_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #5e75e1;\n  background-color: #5e75e1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #6b82e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #5e75e1;\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #5e75e1;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","deepblue":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #5e75e1;\n  background-color: #5e75e1;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #6b82e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #5e75e1;\n  background-color: #6b82e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #5e75e1;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #5e75e1;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","purple_transparent":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #a073e0;\n  background-color: #a073e0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #ae84e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #a073e0;\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #a073e0;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}","purple":"#wovn-translate-widget[wovn] .wovn-lang-selector {\n  border: solid 1px #a073e0;\n  background-color: #a073e0;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang {\n  background-color: #ae84e6;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-current-lang:after {\n  content: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMiA5Ij4KICA8cGF0aCBmaWxsPSIjRkZGRkZGIiBmaWxsLXJ1bGU9Im5vbnplcm8iIGQ9Ik0xMTUuMDc4IDEyLjE4NWEuNjMyLjYzMiAwIDEgMC0uODkzLjg5M2wzLjM2OSAzLjM2OWEuNjMyLjYzMiAwIDAgMCAuODkzIDBsMy4zNjgtMy4zNjlhLjYzMi42MzIgMCAxIDAtLjg5My0uODkzTDExOCAxNS4xMDdsLTIuOTIyLTIuOTIyeiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTExMiAtMTEpIi8+Cjwvc3ZnPg==');\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container {\n  border: solid 1px #a073e0;\n  background-color: #ae84e6;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li {\n  color: rgba(255, 255, 255, 0.7);\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li:hover {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected {\n  background-color: #a073e0;\n  color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-lang-list li.selected:before {\n  background-color: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #translated-by-machine {\n  color: rgba(255, 255, 255, 0.7);\n  background-color: #a073e0;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-letter {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] .wovn-logo svg .color-dot {\n  fill: #ffffff;\n}\n\n#wovn-translate-widget[wovn] #wovn-logo-planet {\n  fill: rgba(255, 255, 255, 0.7);\n}"}}},"hide_logo":{"true":"#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links .wovn-logo--small {\n  display: none!important;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-container .wovn-logo--big {\n  display: none!important;\n}\n\n#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links {\n  padding: 8px!important;\n}\n\n"},"show_tbm":{"true":"#wovn-translate-widget[wovn] #translated-by-machine {\n  display: block!important;\n}"}},
    widgetStyles: "#wovn-translate-widget[wovn],\n#wovn-translate-widget[wovn] a,\n#wovn-translate-widget[wovn] div,\n#wovn-translate-widget[wovn] ul,\n#wovn-translate-widget[wovn] li,\n#wovn-translate-widget[wovn] span,\n#wovn-translate-widget[wovn] svg {\n  -webkit-tap-highlight-color: transparent;\n  -webkit-font-smoothing: antialiased;\n\n  animation : none;\n  animation-delay : 0;\n  animation-direction : normal;\n  animation-duration : 0;\n  animation-fill-mode : none;\n  animation-iteration-count : 1;\n  animation-name : none;\n  animation-play-state : running;\n  animation-timing-function : ease;\n  backface-visibility : visible;\n  background : 0;\n  background-attachment : scroll;\n  background-clip : border-box;\n  background-color : transparent;\n  background-image : none;\n  background-origin : padding-box;\n  background-position : 0 0;\n  background-position-x : 0;\n  background-position-y : 0;\n  background-repeat : repeat;\n  background-size : auto auto;\n  border : 0;\n  border-style : none;\n  border-width : medium;\n  border-color : inherit;\n  border-bottom : 0;\n  border-bottom-color : inherit;\n  border-bottom-left-radius : 0;\n  border-bottom-right-radius : 0;\n  border-bottom-style : none;\n  border-bottom-width : medium;\n  border-collapse : separate;\n  border-image : none;\n  border-left : 0;\n  border-left-color : inherit;\n  border-left-style : none;\n  border-left-width : medium;\n  border-radius : 0;\n  border-right : 0;\n  border-right-color : inherit;\n  border-right-style : none;\n  border-right-width : medium;\n  border-spacing : 0;\n  border-top : 0;\n  border-top-color : inherit;\n  border-top-left-radius : 0;\n  border-top-right-radius : 0;\n  border-top-style : none;\n  border-top-width : medium;\n  bottom : auto;\n  box-shadow : none;\n  box-sizing : content-box;\n  caption-side : top;\n  clear : none;\n  clip : auto;\n  color : inherit;\n  columns : auto;\n  column-count : auto;\n  column-fill : balance;\n  column-gap : normal;\n  column-rule : medium none currentColor;\n  column-rule-color : currentColor;\n  column-rule-style : none;\n  column-rule-width : none;\n  column-span : 1;\n  column-width : auto;\n  content : normal;\n  counter-increment : none;\n  counter-reset : none;\n  cursor : auto;\n  direction : ltr;\n  display : inline;\n  empty-cells : show;\n  float : none;\n  font : normal;\n  font-family: -apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Oxygen-Sans,Ubuntu,Cantarell, \"Helvetica Neue\", \"ヒラギノ角ゴ Pro W3\", \"Hiragino Kaku Gothic Pro\", Osaka, \"メイリオ\", Meiryo, \"ＭＳ Ｐゴシック\", \"MS PGothic\", Padauk, sans-serif;\n  font-size : medium;\n  font-style : normal;\n  font-variant : normal;\n  font-weight : normal;\n  height : auto;\n  hyphens : none;\n  left : auto;\n  letter-spacing : normal;\n  line-height : normal;\n  list-style: none;\n  list-style-image : none;\n  list-style-position : inside;\n  list-style-type : none;\n  margin : 0;\n  margin-bottom : 0;\n  margin-left : 0;\n  margin-right : 0;\n  margin-top : 0;\n  max-height : none;\n  max-width : none;\n  min-height : 0;\n  min-width : 0;\n  opacity : 1;\n  orphans : 0;\n  outline : 0;\n  outline-color : invert;\n  outline-style : none;\n  outline-width : medium;\n  overflow : visible;\n  overflow-x : visible;\n  overflow-y : visible;\n  padding : 0;\n  padding-bottom : 0;\n  padding-left : 0;\n  padding-right : 0;\n  padding-top : 0;\n  page-break-after : auto;\n  page-break-before : auto;\n  page-break-inside : auto;\n  perspective : none;\n  perspective-origin : 50% 50%;\n  position : static;\n  quotes : \'\\201C\' \'\\201D\' \'\\2018\' \'\\2019\';\n  right : auto;\n  tab-size : 8;\n  table-layout : auto;\n  text-align : inherit;\n  text-align-last : auto;\n  text-decoration : none;\n  text-decoration-color : inherit;\n  text-decoration-line : none;\n  text-decoration-style : solid;\n  text-indent : 0;\n  text-shadow : none;\n  text-transform : none;\n  top : auto;\n  transform : none;\n  transform-style : flat;\n  transition : none;\n  transition-delay : 0s;\n  transition-duration : 0s;\n  transition-property : none;\n  transition-timing-function : ease;\n  unicode-bidi : normal;\n  vertical-align : baseline;\n  visibility : visible;\n  white-space: nowrap;\n  widows : 0;\n  width : auto;\n  word-spacing : normal;\n  z-index : auto;\n}\n#wovn-translate-widget[wovn] {\n  max-height : fit-content;\n  pointer-events: auto;\n}\n\n#wovn-translate-widget[wovn] div {\n  display: block;\n}\n\n#wovn-translate-widget[wovn] ul {\n  margin-bottom: 0;\n  margin-right: 0;\n  padding-left: 0;\n  display: block;\n  margin-left: 0;\n  margin-top: 0;\n  padding: 0;\n  margin: 0;\n}\n\n#wovn-translate-widget[wovn] ul::-webkit-scrollbar {\n  display: none;\n}\n\n#wovn-translate-widget[wovn] li {\n  text-align: -webkit-match-parent;\n  display: list-item;\n}\n\n#wovn-translate-widget[wovn]:focus {\n  outline: 0;\n}\n",
    unifiedValues: {
      inlineElements: ["a", "abbr", "b", "bdi", "bdo", "button", "cite", "code", "data", "dfn", "em", "i", "kbd", "label", "legend", "mark", "meter", "option", "q", "rb", "rp", "rt", "rtc", "s", "samp", "small", "span", "strong", "sub", "sup", "time", "u", "var"],
      emptyElements: ["br", "input", "param", "source", "track", "wbr"],
      skipElements: ["base", "link", "noscript", "script", "style", "template"],
      skipElementsWithoutAttributes: ["textarea"],
    },
    tenso: {
      style: "div#wovn-tenso-modal {\n  display: none;\n  z-index: 99999999999;\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  text-align: center;\n  background: rgba(84,95,102, 0.8);\n  overflow-y: auto;\n  font-family: helvetica, arial, \'hiragino kaku gothic pro\', meiryo, \'ms pgothic\', sans-serif;\n}\n.tenso-img {\n  display: inline-block;\n}\n.raku-ichiban-img {\n  display: none;\n}\n.raku-ichiban .tenso-img {\n  display: none;\n}\n.raku-ichiban .raku-ichiban-img {\n  display: inline-block;\n}\ndiv#wovn-tenso-modal.opened {\n  display: block;\n}\ndiv.wovn-tenso-dialog {\n  width: 652px;\n  height: 396px;\n  position: relative;\n  margin: 7% auto;\n  padding: 24px 25px 16px;\n  display: inline-block;\n  border-radius: 3px;\n  opacity: 1;\n  background-color: #ffffff;\n  box-shadow: 0 19px 38px 0 rgba(0, 0, 0, 0.3), 0 15px 12px 0 rgba(0, 0, 0, 0.22);\n}\ndiv.wovn-tenso-close {\n  position: absolute;\n  width: 32px;\n  top: 16px;\n  right: 0;\n  margin: 9px;\n  line-height: 14px;\n  font-size: 30px;\n  color: #bdc4c8;\n  cursor: pointer;\n}\ndiv.wovn-tenso-header {\n  text-align: center;\n}\ndiv.wovn-tenso-logo {\n  position: absolute;\n  top: 71px;\n  left: 69px;\n}\ndiv.wovn-tenso-title {\n  text-align: center;\n  color: #545f66;\n  font-size: 20px;\n  margin-top: 27px;\n  margin-bottom: 25px;\n  height: 30px;\n}\ndiv.wovn-tenso-lang-selector {\n  display: inline-block;\n  padding: 0 5px;\n}\ndiv.wovn-tenso-lang-selector:after {\n  content: \'|\';\n  color: #8f9aa0;\n  font-size: 16px;\n}\ndiv.wovn-tenso-lang-selector:last-child:after {\n  content: \'\';\n}\nspan.wovn-tenso-lang-selector-name {\n  font-size: 14px;\n  color: #469fd6;\n  cursor: pointer;\n}\nspan.wovn-tenso-lang-selector-name.active {\n  color: #545f66;\n}\ndiv.wovn-tenso-subtitle {\n  text-align: center;\n  font-size: 14px;\n  color: #8f9aa0;\n  margin-bottom: 16px;\n  height: 42px;\n}\ndiv.wovn-tenso-subtitle span {\n  display: block;\n}\ndiv.wovn-tenso-steps {\n  height: 170px;\n  position: relative;\n}\ndiv.wovn-tenso-step {\n  text-align:center;\n  display:inline-block;\n  vertical-align: bottom;\n  width: 160px;\n  height: 140px;\n  margin: 5px 17px;\n  border-radius: 3px;\n  background-color: #ffffff;\n  border: solid 1px #e6e6e6;\n}\ndiv.wovn-tenso-step-content {\n  padding: 5px 10px;\n}\ndiv.wovn-tenso-step-title {\n  padding: 15px 0;\n  font-size: 20px;\n  color: #ff4d09;\n}\n.raku-ichiban div.wovn-tenso-step-title {\n  color: #ab263b;\n}\ndiv.wovn-tenso-step-text {\n  font-size: 14px;\n  color: #545f66;\n}\ndiv.wovn-tenso-step-separator {\n  display: inline-block;\n  color: #ff4d09;\n  position: relative;\n  margin-bottom: 70px;\n}\n.raku-ichiban div.wovn-tenso-step-separator {\n  color: #ab263b;\n}\ndiv.wovn-tenso-footer-border {\n  border-top: 1px solid rgba(0,0,0, 0.12);\n  margin: 2px -25px 0 -25px;\n}\ndiv.wovn-tenso-footer {\n}\ndiv.wovn-tenso-footer-buttons {\n  margin-top: 16px;\n}\ndiv.wovn-tenso-cancel-button {\n  display: inline-block;\n  font-size: 12px;\n  padding: 12px 30px;\n  color: #545f66;\n}\ndiv.wovn-tenso-cancel-button:hover {\n  cursor: pointer;\n}\ndiv.wovn-tenso-ok-button {\n  display: inline-block;\n  font-size: 12px;\n  padding: 12px 30px;\n  color: #ffffff;\n  background-color: #FF4D09;\n  border-radius: 3px;\n}\n.raku-ichiban div.wovn-tenso-ok-button {\n  background-color: #ab263b;\n}\ndiv.wovn-tenso-ok-button:hover {\n  background-color: #FF703A;\n}\n.raku-ichiban div.wovn-tenso-ok-button:hover {\n  background-color: #C55062;\n}\ndiv.wovn-tenso-ok-button:active {\n  background-color: #E54508;\n}\n@media(max-width: 600px) {\n  div.wovn-tenso-step-separator {\n    display:none;\n  }\n  div.wovn-tenso-logo {\n    position: relative;\n    padding-top: 20px;\n    top: initial;\n    left: initial;\n  }\n  div.wovn-tenso-dialog {\n    width: 80%;\n    height: 472px;\n  }\n  div.wovn-tenso-step {\n    width: 100%;\n    height: 61px;\n    margin: 5px auto;\n  }\n  div.wovn-tenso-step-title {\n    margin-top: 5px;\n    padding: 0;\n    font-size: 16px;\n    color: #ff4d09;\n  }\n  div.wovn-tenso-step-text {\n    margin-top: -5px;\n    padding: 8px 0 16px 0;\n    font-size: 11px;\n  }\n  div.wovn-tenso-footer-border {\n    margin: 62px -25px 0 -25px;\n  }\n  div.wovn-tenso-title {\n    margin: 20px 0 0 0;\n    font-size: 16px;\n  }\n  div.wovn-tenso-subtitle {\n    font-size: 12px;\n  }\n  div.wovn-tenso-footer-buttons {\n    margin: 16px 0;\n  }\n}\n@media(max-width: 320px) {\n  div.wovn-tenso-dialog {\n    width: 85%;;\n    height: 478px;\n    padding: 24px 16px 16px;\n  }\n  div.wovn-tenso-subtitle {\n    margin-bottom: 22px;\n  }\n}\n\n/* BANNER */\nbody[wovn-tenso-banner-on] {\n  padding-top: 60px;\n}\ndiv#wovn-tenso-banner {\n  display: none;\n  position: absolute;\n  top: 0;\n  left: 0;\n  right: 0;\n  height: 60px;\n  color: #3991c9;\n  background-color: #b7e2fd;\n  font-family: helvetica, arial, \'hiragino kaku gothic pro\', meiryo, \'ms pgothic\', sans-serif;\n  text-align: center;\n  box-shadow: 0 -1px 3px 0 rgba(0, 0, 0, 0);\n}\ndiv#wovn-tenso-banner.raku-ichiban {\n  color: white;\n  background-color: #ab263b;\n}\ndiv#wovn-tenso-banner.opened {\n  display: block;\n}\na.wovn-tenso-banner-content {\n  display: block;\n  width: 100%;\n  height: 100%;\n  text-decoration: none;\n}\ndiv.wovn-tenso-banner-logo {\n  display: inline-block;\n  top: 14px;\n  position: relative;\n}\n.raku-ichiban div.wovn-tenso-banner-logo {\n  top: 12px;\n  width: 72px;\n  height: 33.9px;\n}\ndiv.wovn-tenso-banner-text {\n  display: inline-block;\n  font-size: 14px;\n  top: 7px;\n  position: relative;\n  padding-left: 10px;\n}\n.raku-ichiban div.wovn-tenso-banner-text {\n  color: #ffffff;\n}\ndiv.wovn-tenso-banner-link {\n  display: inline-block;\n  color: #f95c29;\n  font-size: 16px;\n  top: 7px;\n  position: relative;\n  padding-left: 10px;\n}\n\n.raku-ichiban div.wovn-tenso-banner-link {\n  color: #ffffff;\n}\n\n@media (max-width: 440px) {\n  a.wovn-tenso-banner-content {\n    text-decoration: none;\n  }\n  div.wovn-tenso-banner-logo, .raku-ichiban div.wovn-tenso-banner-logo {\n    display: block;\n    top:9px;\n  }\n  .raku-ichiban div.wovn-tenso-banner-logo {\n    width: auto;\n  }\n  div.wovn-tenso-banner-logo img {\n    width: 90px;\n  }\n  .raku-ichiban div.wovn-tenso-banner-logo img {\n    width: 70px;\n  }\n  div.wovn-tenso-banner-text {\n    top: 8px;\n    font-size: 10px;\n  }\n  div.wovn-tenso-banner-link {\n    top: 8px;\n    padding-left: 0;\n    font-size: 12px;\n  }\n}\n",
      modal: "<div class=\"wovn-tenso-dialog\" @click.stop>\n  <div class=\"wovn-tenso-content\">\n    <div class=\"wovn-tenso-close\" @click=\"close\">&times;<\/div>\n    <div class=\"wovn-tenso-header\">\n      <div class=\"wovn-tenso-lang-selector\" v-for=\"lang in languages\">\n        <span v-text=\"http://j.wovn.io/lang.name\" @click=\"changeLang(lang)\" :class=\"{ active: lang.code === currentLangCode }\" class=\"wovn-tenso-lang-selector-name\"><\/span>\n      <\/div>\n    <\/div>\n    <div class=\"wovn-tenso-logo\">\n        <img src=\"tenso_logo_modal-1.png\"/*tpa=http://wovn.io/assets/tenso_logo_modal.png*/ class=\"tenso-img\" alt=\"Tenso\">\n        <img src=\"raku_ichiban_logo_color-1.png\"/*tpa=http://wovn.io/assets/raku_ichiban_logo_color.png*/ class=\"raku-ichiban-img\" alt=\"Tenso\">\n    <\/div>\n    <div class=\"wovn-tenso-title\">\n      <span v-text=\"textContents[currentLangCode].title\"><\/span>\n    <\/div>\n    <div class=\"wovn-tenso-subtitle\">\n      <span v-text=\"textContents[currentLangCode].subtitle1\"><\/span>\n      <span v-text=\"textContents[currentLangCode].subtitle2\"><\/span>\n    <\/div>\n    <div class=\"wovn-tenso-steps\">\n      <div class=\"wovn-tenso-step\">\n        <div class=\"wovn-tenso-step-content\">\n          <div class=\"wovn-tenso-step-title\">STEP 1<\/div>\n          <div class=\"wovn-tenso-step-text\" v-text=\"textContents[currentLangCode].step1\"><\/div>\n        <\/div>\n      <\/div>\n      <div class=\"wovn-tenso-step-separator\">\n        <img src=\"tenso_next_step-1.png\"/*tpa=http://wovn.io/assets/tenso_next_step.png*/ class=\"tenso-img\" alt=\">\">\n        <img src=\"raku_ichiban_next_step-1.png\"/*tpa=http://wovn.io/assets/raku_ichiban_next_step.png*/ class=\"raku-ichiban-img\" alt=\">\">\n      <\/div>\n      <div class=\"wovn-tenso-step\">\n        <div class=\"wovn-tenso-step-content\">\n          <div class=\"wovn-tenso-step-title\">STEP 2<\/div>\n          <div class=\"wovn-tenso-step-text\" v-text=\"textContents[currentLangCode].step2\"><\/div>\n        <\/div>\n      <\/div>\n      <div class=\"wovn-tenso-step-separator\">\n        <img src=\"tenso_next_step-1.png\"/*tpa=http://wovn.io/assets/tenso_next_step.png*/ class=\"tenso-img\" alt=\">\">\n        <img src=\"raku_ichiban_next_step-1.png\"/*tpa=http://wovn.io/assets/raku_ichiban_next_step.png*/ class=\"raku-ichiban-img\" alt=\">\">\n      <\/div>\n      <div class=\"wovn-tenso-step\">\n        <div class=\"wovn-tenso-step-content\">\n          <div class=\"wovn-tenso-step-title\">STEP 3<\/div>\n          <div class=\"wovn-tenso-step-text\" v-text=\"textContents[currentLangCode].step3\"><\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n    <div class=\"wovn-tenso-footer-border\"><\/div>\n    <div class=\"wovn-tenso-footer\">\n      <div class=\"wovn-tenso-footer-buttons\">\n        <div class=\"wovn-tenso-cancel-button\" v-text=\"textContents[currentLangCode].cancel\" @click=\"close\"><\/div>\n        <a v-bind:href=\"langLink\" target=\"_blank\"><div class=\"wovn-tenso-ok-button\" v-text=\"http://j.wovn.io/textContents[currentLangCode].ok\"><\/div><\/a>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/div>\n",
      banner: "<a class=\"wovn-tenso-banner-content\" v-bind:href=\"langLink\" target=\"_blank\">\n  <div class=\"wovn-tenso-banner-logo\">\n      <img src=\"tenso_logo_banner-1.png\"/*tpa=http://wovn.io/assets/tenso_logo_banner.png*/ class=\"tenso-img\" alt=\"Tenso\">\n      <img src=\"raku_ichiban_logo_white-1.png\"/*tpa=http://wovn.io/assets/raku_ichiban_logo_white.png*/ class=\"raku-ichiban-img\" alt=\"Tenso\" id=\"banner-image\">\n  <\/div>\n  <div class=\"wovn-tenso-banner-text\" v-text=\"textContents[currentLangCode].bannerText\"><\/div>\n  <div class=\"wovn-tenso-banner-link\" v-text=\"http://j.wovn.io/textContents[currentLangCode].link\"><\/div>\n<\/a>\n"
    },
    modal: {
      style: "#wovn-machine-translated-modal .wovn-modal {\n  visibility: hidden;\n  opacity: 0;\n  z-index: 99999;\n  position: fixed;\n  top: 0;\n  right: 0;\n  bottom: 0;\n  left: 0;\n  text-align: center;\n  background: rgba(100, 110, 117, 0.9);\n  overflow-y: auto;\n  transition: opacity 300ms, background 300ms, visibility 300ms;\n  font-family: helvetica, arial, \'hiragino kaku gothic pro\', meiryo, \'ms pgothic\', sans-serif;\n}\n#wovn-machine-translated-modal .wovn-modal.opened {\n  display: block;\n  visibility: visible;\n  opacity: 1;\n  cursor: auto;\n}\n \n#wovn-machine-translated-modal .wovn-modal .wovn-modal-container {\n  position: relative;\n  display: inline-block;\n  margin: 200px 200px;\n  padding: 32px 32px 16px;\n  background: white;\n  border-radius: 3px;\n  transform: translateY(0); transition: transform 0ms;\n  box-shadow: 0 12px 12px 0 rgba(0, 0, 0, 0.24), 0 0 12px 0 rgba(0, 0, 0, 0.12);\n}\n@media (max-width: 600px) {\n  #wovn-machine-translated-modal .wovn-modal .wovn-modal-container {\n    margin: 24px 24px;\n  }\n}\n@media (min-width: 601px) and (max-width: 800px) {\n  #wovn-machine-translated-modal .wovn-modal .wovn-modal-container {\n    margin: 100px 100px;\n  }\n}\n#wovn-machine-translated-modal .wovn-modal .wovn-modal-content {\n  text-align: left;\n}\n#wovn-machine-translated-modal .wovn-modal .wovn-modal-content h3 {\n  font-size: 20px;\n  font-weight: normal;\n  color: #27313b;\n  margin-top: 0;\n}\n#wovn-machine-translated-modal .wovn-modal .wovn-modal-content p {\n  font-size: 14px;\n  color: #27313b;\n  margin-bottom: 32px;\n}\n#wovn-machine-translated-modal .wovn-modal .wovn-modal-footer {\n  background-color: #f6f8fa;\n  border-top: solid 1px #eef3f7;\n  margin: 0 -32px -16px -32px;\n  border-radius: 0 0 3px 3px;\n  padding: 16px 30px;\n  position: relative;\n  text-align: right;\n}\n#wovn-machine-translated-modal .wovn-modal button {\n  border-radius: 2px;\n  width: 96px;\n  height: 32px;\n  box-sizing: border-box;\n  text-transform: uppercase;\n  font-size: 12px;\n  font-weight: 600;\n}\n#wovn-machine-translated-modal .wovn-modal button.wovn-modal-back-button {\n  border: solid 1px #eef3f7;\n  background-color: #ffffff;\n  color: #82959f;\n}\n#wovn-machine-translated-modal .wovn-modal button.wovn-modal-ok-button {\n  border: none;\n  background-color: #545f66;\n  border: solid 1px #545f66;\n  cursor: pointer;\n  color: #ffffff;\n}\n#wovn-machine-translated-modal .wovn-modal button.wovn-modal-ok-button:hover {\n  background-color: #6e7c89;\n  border: solid 1px #6e7c89;\n}\n",
      modal: "<div class=\"wovn-modal\" :class=\"{ opened: opened }\" @click.stop=\"close\">\n  <div class=\"wovn-modal-container\" @click.stop>\n    <div class=\"wovn-modal-content\">\n      <h3 v-text=\"title\"><\/h3>\n      <p v-html=\"body\"><\/p>\n    <\/div>\n    <div class=\"wovn-modal-footer\">\n      <button class=\"wovn-modal-ok-button\" @click=\"close\">ok<\/button>\n    <\/div>\n  <\/div>\n<\/div>\n",
    },
    wovnHost: 'https://wovn.io/',
    apiHost: 'https://ee.wovn.io/',
    jWovnHost: 'https://j.wovn.io/',
    cdnOriginHost: 'https://cdn.wovn.io',
    requestWidgetHost: 'https://wovn.global.ssl.fastly.net'
  };
};

if (typeof(components) === 'undefined') var components = {};
components['Url'] = function(widget) {
  var that = this;

  var originalHref = null;

  var isOptionLoaded = false;
  this.reset = function () {
    isOptionLoaded = false;
  }

  var _currentOptions = {
    urlPattern: null
  };

  var imageFilePattern = /^(https?:\/\/)?.*(\.((?!jp$)jpe?g?|bmp|gif|png|btif|tiff?|psd|djvu?|xif|wbmp|webp|p(n|b|g|p)m|rgb|tga|x(b|p)m|xwd|pic|ico|fh(c|4|5|7)?|xif|f(bs|px|st)))(?=([\?#&].*$|$))/i
  var audioFilePattern = /^(https?:\/\/)?.*(\.(mp(3|2)|m(p?2|3|p?4|pg)a|midi?|kar|rmi|web(m|a)|aif(f?|c)|w(ma|av|ax)|m(ka|3u)|sil|s3m|og(a|g)|uvv?a))(?=([\?#&].*$|$))/i
  var videoFilePattern = /^(https?:\/\/)?.*(\.(m(x|4)u|fl(i|v)|3g(p|2)|jp(gv|g?m)|mp(4v?|g4|e?g)|m(1|2)v|ogv|m(ov|ng)|qt|uvv?(h|m|p|s|v)|dvb|mk(v|3d|s)|f4v|as(x|f)|w(m(v|x)|vx)))(?=([\?#&].*$|$))/i
  var docFilePattern = /^(https?:\/\/)?.*(\.(zip|tar|ez|aw|atom(cat|svc)?|(cc)?xa?ml|cdmi(a|c|d|o|q)?|epub|g(ml|px|xf)|jar|js|ser|class|json(ml)?|do(c|t)m?|xps|pp(a|tx?|s)m?|potm?|sldm|mp(p|t)|bin|dms|lrf|mar|so|dist|distz|m?pkg|bpk|dump|rtf|tfi|pdf|pgp|apk|o(t|d)(b|c|ft?|g|h|i|p|s|t)))(?=([\?#&].*$|$))/i

  this.saveOriginalHrefIfNeeded = function () {
    if (this.isLiveEditor()) {
      originalHref = location.href;
    }
  }

  this.getOriginalHref = function () {
    return originalHref;
  }

  /**
   * Get current options
   * @returns {{}}
   */
  function getCurrentOptions() {
    if (isOptionLoaded) {
      return _currentOptions;
    }
    if (widget.tag.getAttribute('urlPattern')) {
      _currentOptions.urlPattern = widget.tag.getAttribute('urlPattern');
      isOptionLoaded = true;
    } else {
      var options = widget.c('Data').getOptions();
      if (options && options.lang_path) {
        switch (options.lang_path) {
          case 'query':
            _currentOptions.urlPattern = 'query';
            break;
          case 'path':
            _currentOptions.urlPattern = 'path';
            break;
          case 'subdomain':
            _currentOptions.urlPattern = 'subdomain';
            break;
          case 'custom_domain':
            _currentOptions.urlPattern = 'custom_domain';
            break;
        }
        isOptionLoaded = true;
      }
    }
    return _currentOptions;
  }

  /**
   * Get current option
   * @returns {{}}
   */
  this.getOptions = function () {
    return getCurrentOptions();
  };

  /**
   * Replace current option
   * @param {{}} options
   */
  this.setOptions = function(options) {
    var currentOptions = getCurrentOptions();
    for (var key in options) if (currentOptions.hasOwnProperty(key)) currentOptions[key] = options[key];
  };

  /**
   * Get current language code
   * @param {string} url
   * @returns {string}
   */
  this.getLangCode = function(url) {
    url = this.getLocation(url || location.href).href;
    var match = null;
    var rx;
    var currentOptions = getCurrentOptions();

    switch (currentOptions.urlPattern) {
      case 'query':
        rx = new RegExp('((\\?.*&)|\\?)wovn=([^#&]+)(#|&|$)');
        match = url.match(rx);
        match = match ? match[3] : null;
        break;
      case 'hash':
        rx = new RegExp('((\\#.*&)|\\#)wovn=([^&]+)(&|$)');
        match = url.match(rx);
        match = match ? match[3] : null;
        break;
      case 'subdomain':
        rx = new RegExp('://([^.]+)\.');
        match = url.match(rx);
        match = match && (widget.c('Lang').isCaseInsensitiveCode(match[1]) || widget.c('Lang').isCaseInsensitiveAlias(match[1])) ? match[1] : null;
        break;
      case 'custom_domain':
        match = widget.c('CustomDomainLanguages').findCustomDomainLanguage(url);
        break;
      case 'path':
        var sitePrefix = widget.c('Config').getSitePrefixPath();
        if (sitePrefix) {
          rx = new RegExp('(://[^/]+|^)/' + sitePrefix + '/([^/#?]+)');
        } else {
          rx = new RegExp('(://[^/]+|^)/([^/#?]+)');
        }

        match = url.match(rx);
        match = match && (widget.c('Lang').isCode(match[2]) || widget.c('Lang').isAlias(match[2])) ? match[2] : null;
        break;
    }
    if (match) {
      var langCode = widget.c('Lang').getCode(match);
      if (langCode) {
        if (!widget.c('Lang').hasAlias(langCode) || (match === widget.c('Lang').getLangIdentifier(langCode))) {
          return langCode;
        }
      }
    }
    return widget.c('Lang').getDefaultCodeIfExists();
  };

  /**
   * Detects the protocol used for a given URL.
   *
   * @param {String} url The URL to process.
   *
   * @return {String} The protocol of the given URL.
   */
  this.getProtocol = function(url) {
    var protocolMatching = /^([a-zA-Z]+):/.exec(url);

    if (protocolMatching && protocolMatching[1]) {
      return protocolMatching[1].toLowerCase();
    }

    return location.protocol.replace(/:$/, '').toLowerCase();
  }

  this.getDomainPort = function(url) {
    var match = /:\/\/(.[^\/]+)\/?/.exec(url);
    if (match) {
      return match[1];
    } else {
      return '';
    }
  };

  this.getFlags = function (url) {
    url = url || location.href;
    var hash = url.match(/#[^?]*$/);
    hash = hash ? hash[0] : '#';

    var match = hash.match(/(^|#|&)wovn=([^#&]*)(&|#|$)/);
    if (!match || match.length < 3) return [];
    // remove empty flags in the middle or beginning/ending of string
    var match = match[2].replace(/,(,+)/g, ',').replace(/^,|,$/g, '');
    if (match === '') return [];

    return match.split(',');
  };

  this.hasFlag = function (flag, url) {
    url = url || location.href;

    var flags = that.getFlags(url);

    return widget.c('Utils').indexOf(flags, flag) !== -1;
  };

  this.isFilePathURI = function (url) {
    if (url) var parsed_url = url.split('?')[0]
    return url && (parsed_url.match(imageFilePattern) ||
      parsed_url.match(audioFilePattern) ||
      parsed_url.match(videoFilePattern) ||
      parsed_url.match(docFilePattern))
  }

  this.getUrl = function(lang, url, bypassFilepathCheck) {
    url = url || location.href;
    var protocol = this.getProtocol(url);

    if (protocol !== 'http' && protocol !== 'https') {
      return url;
    }

    if (!bypassFilepathCheck && this.isFilePathURI(url)) {
      return url;
    }

    var oldLangCode = this.getLangCode(url);
    var newLangCode = widget.c('Lang').getCode(lang);
    var urlPattern = getCurrentOptions().urlPattern;

    var urlFormatter = widget.c('UrlFormatter').createFromUrl(url);

    return urlFormatter.getConvertedLangUrl(oldLangCode, newLangCode, urlPattern)
  }

  this.isAbsoluteUrl = function (url) {
    var isAbsolute = new RegExp('^([a-z]+://|//)', 'i');
    return isAbsolute.test(url);
  }

  /**
   * Get url for specific language
   * @param {string} lang
   * @param {Element} node
   * @returns {string|null}
   */
  this.langUrl = function(lang, node) {
    var url = node.getAttribute('href');
    var currentOptions = getCurrentOptions();

    if (!currentOptions.urlPattern) {
      return null;
    }

    var data = widget.c('Data');

    var protocol = this.getProtocol(url);
    if (protocol !== 'http' && protocol !== 'https') {
      return null;
    }

    var urlLocation = this.getLocation(url);
    var urlLocationWithoutLanguage = this.getLocation(removeBackendLanguageFromLocation(urlLocation));

    if (url && this._isExcludedUrl(urlLocationWithoutLanguage, data.getExcludedPaths(), data.getExcludedUrls())) {
      if (!this.isAbsoluteUrl(url)) {
        // relative urls may be appended to a translated browser URL, so even if the path was excluded we need to remove the language from the full URL
        var urlWithLanguageRemoved = widget.c('UrlFormatter').createFromUrl(urlLocationWithoutLanguage).getNormalizedPageUrl(widget.isBackend(), currentOptions.urlPattern);
        return urlWithLanguageRemoved;
      }
      
      return null;
    }

    if (url && node.host && (node.host.toLowerCase() === location.host.toLowerCase() || currentOptions.urlPattern === 'subdomain' || currentOptions.urlPattern === 'custom_domain')) {
      if (url === '' || url.match(/^[#?]/)) {
        return null;
      }

      url = node.protocol + '//' + node.host + node.pathname + node.search + node.hash;

      // case when urlPattern is subdomain and url absolute
      if (currentOptions.urlPattern === 'subdomain') {
        if (node.host.toLowerCase() !== location.host.toLowerCase()) {
          url = url.replace(new RegExp('://' + widget.c('Lang').getLangIdentifier(this.getLangCode(url)) + '\\.', 'i'), '://');
          node.href = url;
          // we need to check if the hosts actually match again because if the host never contained a language
          var parser = document.createElement('a');
          parser.href = location.href.replace(new RegExp('://' + widget.c('Lang').getLangIdentifier(this.getLangCode(location.href)) + '\\.', 'i'), '://');
          if (node.host.toLowerCase() !== parser.host) {
            return null;
          }
        }
      } else if (currentOptions.urlPattern === 'custom_domain') {
        var hasCustomDomainLanguage = widget.c('CustomDomainLanguages').findCustomDomainLanguage(url);
        if (!hasCustomDomainLanguage) {
          return null;
        }
      }
      return this.getUrl(lang, url);
    }

    return null;
  };

  this._isExcludedUrl = function (urlLocationWithoutLanguage, excludedPaths, excludedUrls) {
    return excludedPaths.some(function (p) { return widget.c('StringUtils').startsWith(urlLocationWithoutLanguage.pathname, p); }, this)
      || excludedUrls.some(function (u) { return this._matchesExcludedUrl(u, urlLocationWithoutLanguage); }, this);
  }

  this._matchesExcludedUrl = function (excludedUrl, parsedUrl) {
    var parsedExcludedUrl = this.getLocation(excludedUrl);
    
    return parsedUrl.protocol === parsedExcludedUrl.protocol
      && parsedUrl.hostname === parsedExcludedUrl.hostname
      && parsedUrl.pathname === parsedExcludedUrl.pathname;
  }

  this.changeUrl = function(langCode) {
    if (this.isLiveEditor())
      return;
    var newLocation = this.getUrl(langCode);
    // If a browser doesn't support history.replaceState, the location will be changed
    // ALSO, if the host(subdomain) changes, the location wil also be changed
    try {
      if (widget.c('Data').getOptions().force_reload)
        throw('dummy exception');
      else {
        var newState = window.history.state || {};
        newState['wovn'] = langCode;
        window.history.replaceState(newState, null, newLocation);
      }
    }
    catch (e) {
      location.href = newLocation;
    }
  }

  this.getLiveEditorSession = function () {
    var tokenRegex = /wovn\.editing=([A-Za-z0-9-_?=]+)/;
    var match = location.href.match(tokenRegex);

    if (!match && originalHref) {
      match = originalHref.match(tokenRegex);
    }

    return match && match[1] ? match[1] : '';
  }

  this.getLiveEditorTargetLangCode = function () {
    var langRegex = /wovn\.targetLang=([^&]*)/;
    var match = location.hash.match(langRegex);

    if (!match && originalHref) {
      match = originalHref.match(langRegex);
    }

    return match && match[1] ? match[1] : '';
  }

  this.getLiveEditorWidgetLangCode = function () {
    var langRegex = /wovn\.widgetLang=([^&]*)/;
    var match = location.hash.match(langRegex);

    if (!match && originalHref) {
      match = originalHref.match(langRegex);
    }

    return match && match[1] ? match[1] : 'en';
  }

  this.isLiveEditor = function () {
    var liveEditorRegex = /wovn\.editing/i;

    if (liveEditorRegex.test(location.href)) return true;
    if (originalHref) {
      return liveEditorRegex.test(originalHref);
    }
    return false;
  }

  this.isIframeLiveEditor = function () {
    return /wovn\.iframeEditing/i.test(location.href);
  }

  this.removeIframeLiveEditorMarkFromHash = function () {
    location.hash = location.hash.replace(/wovn\.iframeEditing(?=1)?/i, '')
  }

  this.getEncodedLocation = function (customLocation) {
    return encodeURIComponent(removeBackendLanguageFromLocation(customLocation));
  };

  this.removeHash = function(url) {
    var index = url.indexOf('#');
    return index === -1 ? url : url.substr(0, index);
  };

  /**
   * Gets the current location of the browser without the backend-inserted lang code
   *
   * @return {string} The unicode-safe location of this browser without the lang code
   */
  function removeBackendLanguageFromLocation (currentLocation) {
    // not all browsers handle unicode characters in the path the same, so we have this long mess to handle it
    // TODO: decodeURIcomponent doesnt handle the case where location has char like this: &submit=%8E%9F%82%D6%90i    %82%DE (characters encoded in shift_jis)
    // adding unescape before it makes the error go away but doesnt fix the pb and creates pb for utf8 encode params
    if (!currentLocation)
      currentLocation = location;
    if (typeof(currentLocation) !== 'string')
      currentLocation = currentLocation.protocol + '//' + currentLocation.host + currentLocation.pathname + currentLocation.search;

    if (widget.tag.getAttribute('backend')) {
      var currentLangIdentifier = widget.c('Lang').getBackendLangIdentifier();
      switch (widget.tag.getAttribute('urlPattern')) {
        case 'query':
          currentLocation = currentLocation.replace(new RegExp('(\\?|&)wovn=' + currentLangIdentifier + '(&|$)'), '$1').replace(/(\?|&)$/, '');
          break;
        case 'subdomain':
          currentLocation = currentLocation.replace(new RegExp('//' + currentLangIdentifier + '.', 'i'), '//');
          break;
        case 'custom_domain':
          currentLocation = widget.c('CustomDomainLanguages').removeLanguageFromAbsoluteUrl(currentLocation, currentLangIdentifier);
          break;
        case 'path':
          var defaultLangAlias = widget.c('Lang').defaultLangAlias()
          if (defaultLangAlias) {
            currentLocation = currentLocation.replace(new RegExp('(//[^/]+)/' + currentLangIdentifier + '(/|$)'), '$1/' + defaultLangAlias + '/');
          } else {
            currentLocation = currentLocation.replace(new RegExp('(//[^/]+)/' + currentLangIdentifier + '(/|$)'), '$1/');
          }
      }
    }
    return currentLocation;
  }

  this.apiHostBase = widget.c('RailsBridge')['apiHost'];
  this.getApiHost = function () {
    var host = this.apiHostBase;
    return host.replace(/^.*\/\//, '//');
  }

  this.getLocation = function (url) {
    var newLocation = document.createElement('a');
    newLocation.href = url;

    // IE dont load the attributes "protocol" and "host" in case the source URL
    // is just a pathname, that is, "/example" and not "http://domain.com/example".
    newLocation.href = newLocation.href;

    // IE 7 and 6 won't load "protocol" and "host" even with the above workaround,
    // so we take the protocol/host from window.location and place them manually
    if (newLocation.host === "") {
      var newProtocolAndHost = window.location.protocol + "//" + window.location.host;
      if (url.charAt(1) === "/") {
        newLocation.href = newProtocolAndHost + url;
      } else {
        // the regex gets everything up to the last "/"
        // /path/takesEverythingUpToAndIncludingTheLastForwardSlash/thisIsIgnored
        // "/" is inserted before because IE takes it of from pathname
        var currentFolder = ("/"+newLocation.pathname).match(/.*\//)[0];
        newLocation.href = newProtocolAndHost + currentFolder + url;
      }
    }

    if (newLocation.pathname[0] !== '/') {
      // There is a bug in IE11 where pathname will not start with a / until children is evaluated
      newLocation.children;
    }

    return newLocation;
  }

  this.getNormalizedHost = function (location) {
    var host = location.host;

    if (location.protocol === 'http:' && /:80$/.test(host)) {
      host = host.replace(/:80$/, '')
    } else if (location.protocol === 'https:' && /:443$/.test(host)) {
      host = host.replace(/:443$/, '')
    }

    return host;
  }

  /**
   * Say true if url is third-party's link
   */
  this.shouldIgnoreLink = function (url) {
    // get url's location and host
    var urlFormatter = widget.c('UrlFormatter').createFromUrl(url);
    var urlHost = urlFormatter.extractHost();

    // get current location and host
    var curLocationFormatter = widget.c('UrlFormatter').createFromUrl("/");
    var currentHost = curLocationFormatter.extractHost();

    var host_aliases = widget.c('Data').createNormalizedHostAliases();
    host_aliases.push(currentHost);

    return host_aliases.indexOf(urlHost) == -1;
  }
};

if (typeof(components) === 'undefined') var components = {};
components['AuditTrigger'] = function(widget) {
  var that = this;
  var timeout;
  var editMode = false;
  var inspectingMode = false;

  this.auditor = function () {};

  this.auditWorker = widget.c('SingleWorker').createSingleWorker();

  widget.c('Utils').onDomReady(function () {
    var touchEnabled = 'ontouchstart' in document;
    var clickNodes = [document.body];
    clickNodes = clickNodes.concat(widget.c('Utils').toArrayFromDomList(document.getElementsByTagName('a')));
    clickNodes = clickNodes.concat(widget.c('Utils').toArrayFromDomList(document.getElementsByTagName('button')));
    clickNodes = clickNodes.concat(widget.c('Utils').toArrayFromDomList(document.getElementsByTagName('input')));
    for (var i = 0; i < clickNodes.length; i++) {
      // add touch listener and click if the device is touch enabled
      // some devices can have both click and touch (surface)
      processEvent(clickNodes, i, 'click');
      if (touchEnabled){
        processEvent(clickNodes, i, 'touchend');
      }
    }
  }, true);

  /**
   * At each event trigger, renews the timer of the audit or decorates the page
   * @param {object} clickNodes html nodes on the page being tracked for events
   * @param {number} i the node index
   * @param {string} eventName the event name
   */
  function processEvent(clickNodes, i, eventName) {
    widget.c('Utils').onEvent(clickNodes[i], eventName, function () {
      if (!editMode) {
        renewTimeout();
      }
      else {
        if (widget.c('Url').isLiveEditor() && !inspectingMode) {
          widget.c('LiveEditor').decoratePage();
        }
      }
    });
  }

  this.start = function() {
    renewTimeout();
  };

  this.getEditMode = function() {
    return editMode
  };

  this.getInspectingMode = function() {
    return inspectingMode
  };

  this.setInspectingMode = function(isInspectedMode) {
    if (typeof(isInspectedMode) !== 'boolean') {
      throw 'Invalid type for isInspectedMode. Value should be a boolean'
    }
    inspectingMode = isInspectedMode
  };

  this.editStop = function() {
    editMode = true;
    clearTimeout(timeout);
  };

  this.stop = function() {
    clearTimeout(timeout);
  };

  this.destroy = function() {
    that.stop();
  };

  /**
   * reset Audit's count and execute audit
   * @param maxInterval
   */
  function renewTimeout(maxInterval) {
    if (!maxInterval) maxInterval = 25000;

    var totalAuditCount = 5;
    var currentAuditCount = 0;
    var callAudit = function() {
      // When current language is same as default, almost values are properly swapped (includes new values).
      // so reduce opportunity of swapVals()
      if (widget.c('DomAuditor').getInternalCurrentLang() === widget.c('Lang').getDefaultCodeIfExists()) {
        if (currentAuditCount % 2 === 0) {
          return
        }
      }
      // First SwapVals() is slower than later, (maybe because of JIT or DOM's cache?)
      // For faster rendering (e.g. scroll), ignore everyBlock's swap (everyBlock is for swap css' image)
      var swapsProperty = currentAuditCount !== 0;
      that.auditor(null, swapsProperty);
    };

    var bookNext = function() {
      if (currentAuditCount >= totalAuditCount || editMode) return;
      currentAuditCount++;
      var interval = maxInterval * Math.pow(currentAuditCount, 2) / Math.pow(totalAuditCount, 2);
      timeout = that.auditWorker.setTimeout(callAudit, bookNext, interval);
    }
    that.auditWorker.setTimeout(callAudit, bookNext, 0);
  }
};

if (typeof(components) === 'undefined') var components = {};
components['Interface'] = function(widget) {
  var that = this;

  var WIDGET_ID = 'wovn-translate-widget';
  that.WIDGET_ID = WIDGET_ID;
  var CUSTOM_WIDGET_ID = 'wovn-languages';
  that.CUSTOM_WIDGET_ID = CUSTOM_WIDGET_ID;
  var appendedChildren = [];
  var attachedHandlers = [];
  var widgetElement;

  this.addClass = function (ele, targetClass) {
    var trimmedClass = widget.c('Utils').trimString(targetClass);
    var rx = new RegExp('(^| )' + trimmedClass + '( |$)');
    // if class list already contains className
    if (rx.test(ele.className)) return;
    ele.className = ele.className.length == 0 ? targetClass : ele.className + ' ' + targetClass;
  }

  this.removeClass = function (ele, targetClass) {
    var trimmedClass = widget.c('Utils').trimString(targetClass);
    var rx = new RegExp('(^| )' + trimmedClass + '( |$)', 'g');
    var className = ele.className.replace(rx, '').replace(/\s+/g, ' ');
    ele.className = widget.c('Utils').trimString(className);
  }

  this.hasClass = function (ele, targetClass) {
    return (' ' + ele.className + ' ').indexOf(' ' + targetClass + ' ') > -1;
  }

  function wovnGetElementsByClassName(node, classname) {
    return widget.c('Utils').toArrayFromDomList(node.querySelectorAll('.' + classname));
  }

  function setWidgetLangChangeWord(widgetElem, newWord) {
    if (widget.c('Data').getOptions()['use_generic_lang_word']) {
      var genericLangWord = widget.c('Data').getOptions()['generic_lang_word']
      setInnerHTMLByClass(widgetElem, 'wovn-current-lang', genericLangWord || 'Language');
    }
    else {
      setInnerHTMLByClass(widgetElem, 'wovn-current-lang', newWord || 'Language');
    }
  }

  function setInnerHTMLByClass(ancestor, className, value) {
    var targets = wovnGetElementsByClassName(ancestor, className);
    for (var i = 0; i < targets.length; i++)
      targets[i].innerHTML = value;
  }

  function onEvent (target, eventName, handler) {
    widget.c('Utils').onEvent(target, eventName, handler);
    attachedHandlers.push({'target': target, 'eventName': eventName, 'handler': handler});
  }

  this.insertStyles  = function (styles) {
    if (!styles) return;
    if (styles.constructor === Array)
      styles = styles.join('\n');
    var styleElement = document.createElement('style');
    styleElement.type = 'text/css';
    styleElement.className = 'wovn-style';
    try {
      styleElement.innerHTML = styles;
    }
    catch (e) {
      styleElement.styleSheet.cssText = styles;
    }
    document.getElementsByTagName('head')[0].appendChild(styleElement);
    appendedChildren.push(styleElement);
  }

  function disableBrowserTranslation () {
    if (widget.c('Utils').getMetaElement('google', {value: 'notranslate'})) return;
    var chrome = document.createElement('meta');
    chrome.setAttribute('name', 'google');
    chrome.setAttribute('value', 'notranslate');
    document.getElementsByTagName('head')[0].appendChild(chrome);
    appendedChildren.push(chrome);
  }

  var scrollTop = 0;
  var scrollTopBefore = 0;
  var documentScrollTop = 0;
  var onHoldAnim = null;

  /**
   * set animation to hide the widget
   */
  function animHideWidget(widget) {
    if (!widget) return;
    widget.className = widget.className.replace(/slide-in/, 'slide-out');
  }

  /**
   * set animation to show the widget
   */
  function animShowWidget(widget) {
    if (!widget) return;
    widget.className = widget.className.replace(/slid-out/, '').replace(/slide-out/, 'slide-in');
  }

  /**
   * check scroll action DOWN/UP
   */
  function scrollWidgetAction() {
    documentScrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
    var widget = that.getStandardWidgetElement();
    var langListContainer = document.getElementsByClassName('wovn-lang-container')[0];

    if (documentScrollTop <= scrollTop) {
      animScrollUp(widget, langListContainer);
    }
    else {
      animScrollDown(widget, langListContainer);
    }
    scrollTop = documentScrollTop;
  }

  /**
   * check scroll action DOWN/UP then STOP
   */
  function scrollStopWidgetAction() {
    documentScrollTop = (window.pageYOffset || document.documentElement.scrollTop) - (document.documentElement.clientTop || 0);
    var widget = that.getStandardWidgetElement();
    var langListContainer = document.getElementsByClassName('wovn-lang-container')[0];

    if (documentScrollTop <= scrollTopBefore) {
      animScrollUpThenStop(widget, langListContainer);
    }
    else {
      animScrollDownThenStop(widget, langListContainer);
    }
    scrollTopBefore = scrollTop;
    scrollTop = documentScrollTop;
  }

  /**
   * animation behaviour on scrollTop
   */
  function animScrollUp(widget, langListContainer) {
    if(onHoldAnim !== null) clearTimeout(onHoldAnim);
    if (!widget) return;
    if (that.hasClass(langListContainer, 'is-open')) return;

    animShowWidget(widget);
    onHoldAnim = setTimeout(function() {
      animHideWidget(widget);
    }, 1000);
  }

  /**
   * animation behaviour on scrollDown
   */
  function animScrollDown(widget, langListContainer) {
    if(onHoldAnim !== null) clearTimeout(onHoldAnim);
    if (!widget) return;
    if (that.hasClass(langListContainer, 'is-open')) return;

    onHoldAnim = setTimeout(function() {
      animHideWidget(widget);
    }, 1000);
  }

  /**
   * animation behaviour on scrollTop then STOP
   */
  function animScrollUpThenStop(widget, langListContainer) {
    if(onHoldAnim !== null) clearTimeout(onHoldAnim);
    if (!widget) return;
    if (that.hasClass(langListContainer, 'is-open')) return;

    animShowWidget(widget);
    onHoldAnim = setTimeout(function() {
      animHideWidget(widget);
    }, 4000);
  }

  /**
   * animation behaviour on scrollDown then STOP
   */
  function animScrollDownThenStop(widget, langListContainer) {
    if(onHoldAnim !== null) clearTimeout(onHoldAnim);
    if (!widget) return;
    if (that.hasClass(langListContainer, 'is-open')) return;

    animShowWidget(widget);
    onHoldAnim = setTimeout(function() {
      animHideWidget(widget);
    }, 4000);
  }


  this.scrollStop = function (callback) {

    if (!callback || Object.prototype.toString.call(callback) !== '[object Function]') return;

    var isScrolling;

    window.addEventListener('scroll', function (event) {
      window.clearTimeout(isScrolling);

      isScrolling = setTimeout(function() {
        callback();
      }, 300);
    }, false);
  };

  function ensureDefaultLangInList (langs) {
    var defaultLangCode = widget.c('Data').getLang()

    if (defaultLangCode) {
      var defaultLang = widget.c('Lang').get(defaultLangCode)
      if (!langs.some(function (lang) { return lang.code === defaultLang.code; })) {
        langs.unshift(defaultLang)
      }
    }

    return langs
  }

  /**
   * Build Widget's Language List
   *
   * @param langs to use
   */
  function buildWidgetLangList (widgetElem, langs) {
    if (!widgetElem) return;
    var widgetList = widgetElem.className.match(/\bwovn-lang-list\b/) ? widgetElem : wovnGetElementsByClassName(widgetElem, 'wovn-lang-list')[0];
    if (!widgetList) return;

    langs = ensureDefaultLangInList(langs || [])

    // c('Url').getLangCode will return the path lang if using backend or wovnDefaultLang otherwise
    var selectedLang = widget.c('Url').getLangCode();
    if (selectedLang != widget.c('Lang').getDocLang()) {
      selectedLang = widget.c('Lang').getDocLang();
    }
    if (widget.c('Utils').findIndex(langs, selectedLang, function (ele, val) { return ele.code === val;}) === -1) {
      selectedLang = widget.c('Lang').getDefaultCodeIfExists();
    }

    var listItem, selectedLangName;
    for (var i = 0; i < langs.length; i++) {
      var lang = langs[i];
      listItem = document.createElement('li');
      listItem.setAttribute('class', 'wovn-switch');
      listItem.innerHTML = lang.name;
      listItem.setAttribute('data-value', lang.code);
      if (lang.code == selectedLang) {
        listItem.setAttribute('class', 'wovn-switch selected');
        selectedLangName = lang.name;
      }

      widgetList.appendChild(listItem);
    }

    setWidgetLangChangeWord(widgetElem, selectedLangName)
  }

  var isChangingLang = false;

  this.changeLangByCode = function (languageCode, changedCallback) {
    that._changeLang(languageCode, changedCallback, false);
  }

  this._onLanguageSwitchClicked = function (languageSwitch) {
    var languageCode = languageSwitch.getAttribute('data-value');
    that._changeLang(languageCode, null, true);
  }

  this._changeLang = function (newLangCode, changedCallback, isManualLangChangeByUser) {
    // Do nothing when page is not ready
    var defaultCode = widget.c('Lang').getDefaultCodeIfExists();
    if (!defaultCode) return;

    if (isChangingLang) {
      setTimeout(function() { that._changeLang(newLangCode, changedCallback, isManualLangChangeByUser); }, 100);
      return;
    }
    isChangingLang = true;

    widget.c('Lang').setDocLang(newLangCode);
    if (changedCallback) {
      changedCallback(newLangCode);
    }

    if (widget.c('Data').useMachineTranslatedModal()) {
      // Know if lang change comes from human manual change or automatic change (API, Cookie)
      widget.c('MachineTranslatedModal').start(isManualLangChangeByUser);
    }
    if (widget.c('ParcelForwarding').banner) {
      widget.c('ParcelForwarding').banner.changeLang();
    }
    widget.c('TagCustomization').load();

    that._getWidgetElements().forEach(function (widgetElement) {
      updateSelectedLanguage(widgetElement, newLangCode);
    });

    isChangingLang = false;
  };

  this._loadLiveEditor = function () {
    var loadedOne = false;
    function kickoffEditor () {
      if (loadedOne) {
        widget.c('LiveEditor').start();
      }
      else {
        loadedOne = true;
      }
    }

    widget.loadComponents(['Vue', 'LiveEditor'], {'Vue': kickoffEditor, 'LiveEditor': kickoffEditor});
  }

  function updateSelectedLanguage(widgetElement, newLangCode) {
    var langSwitches = wovnGetElementsByClassName(widgetElement, 'wovn-switch');
    var selectedLanguageSwitch = null;
    for (var i = 0; i < langSwitches.length; i ++) {
      that.removeClass(langSwitches[i], 'selected');
      if (langSwitches[i].getAttribute('data-value') === newLangCode) {
        that.addClass(langSwitches[i], 'selected');
        selectedLanguageSwitch = langSwitches[i];
      }
    }

    if (selectedLanguageSwitch && that.isStandardWidgetElement(widgetElement)) {
      setWidgetLangChangeWord(widgetElement, selectedLanguageSwitch.textContent || selectedLanguageSwitch.innerText)
    }
  }

  function attachLangClickHandlers (widgetElem) {
    if (!widgetElem) return;
    var clickTargets = wovnGetElementsByClassName(widgetElem, 'wovn-switch');
    if (clickTargets.length === 0) clickTargets = widget.c('Utils').toArrayFromDomList(widgetElem.getElementsByTagName('a'));
    if (clickTargets.length === 0) clickTargets = widget.c('Utils').toArrayFromDomList(widgetElem.getElementsByTagName('li'));
    if (clickTargets.length === 0) return;

    clickTargets.forEach(function (clickTarget) {
      onEvent(clickTarget, 'click', function () {
        that._onLanguageSwitchClicked(clickTarget);
      });
    });
  }

  var widgetOptionShori = (function () {
    var shoris = {};
    shoris.type = function (opts, opt) {
      var type = opts[opt];

      var isStandardWidget = type === 'widget' || (type === 'auto' && that._getCustomWidgetElements().length == 0);
      if (isStandardWidget) {
        var widgetElement = that.getStandardWidgetElement();
        buildWidgetLangList(widgetElement, widget.c('Data').getConvertedLangs());
        attachLangClickHandlers(widgetElement);
      } else {
        configureCustomWidget(type);
      }
    };

    function configureCustomWidget(customWidgetType) {
      if (customWidgetType === 'built_in' && that._getCustomWidgetElements().length == 0) {
        that.insertStyles('#wovn-translate-widget {display: none !important;}');
        return;
      }
      var dataAttribute = '';
      var standardWidget = that.getStandardWidgetElement();
      if (standardWidget) {
        dataAttribute = standardWidget.getAttribute('data-ready');
        removeNode(standardWidget);
      }
      that._getCustomWidgetElements().forEach(function (customWidget) {
        renderCustomWidget(customWidget, dataAttribute);
      });
    }

    function renderCustomWidget(customWidget, dataAttribute) {
      customWidget.setAttribute('data-ready', dataAttribute);
      customWidget.setAttribute('data-theme', 'built-in');
      // if there is a template
      if (wovnGetElementsByClassName(customWidget, 'wovn-switch-template').length !== 0) {
        var original = wovnGetElementsByClassName(customWidget, 'wovn-switch-template')[0];
        var hasSwitch = original.className.match(/(^| )wovn-switch( |$)/i) || function () {
          for (var i = 0; i < original.children.length; i++) {
            if (original.children[i].className.match(/(^| )wovn-switch( |$)/i))
              return true;
          }
          return false;
        }();
        // if there's no switch class we will put it on the template element
        if (!hasSwitch) that.addClass(original, 'wovn-switch');
        var template = document.createElement('div');
        template.appendChild(original.cloneNode(true));
        var newSwitch;
        var convertedLangs = ensureDefaultLangInList(widget.c('Data').getConvertedLangs());
        for (var i = 0; i < convertedLangs.length; i++) {
          newSwitch = document.createElement('div');
          newSwitch.innerHTML = template.innerHTML.replace(/wovn-lang-name/g, convertedLangs[i].name);
          wovnGetElementsByClassName(newSwitch, 'wovn-switch')[0].setAttribute('data-value', convertedLangs[i].code);
          original.parentNode.insertBefore(newSwitch.children[0], original);
        }
        removeNode(original);
      }
      // if there are no switches in the container, we may have to build them
      else if (wovnGetElementsByClassName(customWidget, 'wovn-switch').length === 0) {
        // if there are no anchors (and no switches), we have to build the inner structure
        if (customWidget.getElementsByTagName('a').length === 0) {
          customWidget.innerHTML = '';
          if (customWidget.nodeName.toLowerCase() === 'ul' || customWidget.nodeName.toLowerCase() === 'ol') {
            var list = customWidget;
            that.addClass(list, 'wovn-lang-list');
          }
          else {
            var list = document.createElement('ul');
            list.className = 'wovn-lang-list';
            customWidget.appendChild(list);
          }
          buildWidgetLangList(customWidget, widget.c('Data').getConvertedLangs());
        }
        // if there are no switches, but there are anchor tags, make the anchor tags switches
        else {
          var switches = customWidget.getElementsByTagName('a');
          for (var i = 0; i < switches.length; i++)
            switches[i].className = switches[i].className + (switches[i].className.length > 0 ? switches[i].className + ' ' : '') + 'wovn-switch';
        }
      }
      attachLangClickHandlers(customWidget);
    }

    shoris.position = function (opts, opt) {
      if (!opts[opt] || opts[opt] === 'default') return;
      var widgetElem = that.getStandardWidgetElement();
      if (widgetElem) that.addClass(widgetElem, 'position-' + opts[opt].replace(/[ _]/g, '-'));
    };

    /**
      * Hide widget by setting and browser language.
      *
      * @param opts {Object} widget.c('Data').getOptions()
      * @param opt {String} always returns 'auto_hide_widget'
      */
    shoris.auto_hide_widget = function (opts, opt) {
      if (!opts[opt] || (typeof opts[opt] === 'string' && !opts[opt].match(/true/i))) return;
      var browserLang = widget.c('Lang').getBrowserLang();
      var rx = new RegExp('^' + widget.c('Data').getLang(), 'i');
      if (widget.c('Data').getLang() === browserLang || rx.test(browserLang)) {
        removeNode(that.getStandardWidgetElement());
        that._getCustomWidgetElements().forEach(removeNode);
      }
    };

    /**
     * Hide WOVN.io logo.
     * @param opts {Object} widget.c('Data').getOptions()
     * @param opt {String} always returns 'hide_logo'
     */
    shoris.hide_logo = function (opts, opt) {
      if (!opts[opt]) return;
      var widgetElem = that.getStandardWidgetElement();
      if (widgetElem) {
        that.addClass(widgetElem, 'hide-logo');
      }
    };

    /**
     * Show translated by machine image
     * @param opts {Object} widget.c('Data').getOptions()
     */
    shoris.show_tbm = function (opts) {
      if (opts["show_tbm"] !== true) return;
      var widgetElem = that.getStandardWidgetElement();
      if (widgetElem) {
        that.addClass(widgetElem, 'show-tbm');
      }
    };

    return function (options, opt) {
      if (typeof shoris[opt] === 'object') {
        if (arguments.length === 3 && typeof arguments[2] === 'string' && typeof shoris[opt][arguments[2]] === 'function')
          return shoris[opt][arguments[2]](options, opt);
      }
      else if (typeof shoris[opt] === 'function')
        return shoris[opt](options, opt);
    };
  })();

  function applyWidgetOptions(options) {
    if (options) var opts = options;
    else if (widget.c('Data').getOptions()) var opts = widget.c('Data').getOptions();
    else return;
    var widgetOptionStyles = (widget.c('Data').get().widgetOptions && widget.c('Data').get().widgetOptions.css) || {};
    var styles = [];
    for (var opt in opts){if(opts.hasOwnProperty(opt)) {
      if (widgetOptionStyles.hasOwnProperty(opt)) {
        if (typeof opts[opt] === 'boolean') {
          if (opts[opt]) styles.push(widgetOptionStyles[opt]);
        }
        else {
          styles.push(widgetOptionStyles[opt]);
        }
      }
      var shoriResult = widgetOptionShori(opts, opt);
      // if shori result is an array
      if (typeof shoriResult === 'object' && shoriResult.constructor === Array) styles = styles.concat(shoriResult);
    }}
    that.insertStyles(styles);

    // user must have parcel_forwarding feature and viewer must be outside Japan
    if (!!opts.parcel_forwarding && widget.c('Data').getCountryCode() !== 'JP') {
      var loadedOne = false;
      function kickoffParcelForwarding () {
        if (loadedOne)
          widget.c('ParcelForwarding').start();
        else
          loadedOne = true;
      }
      widget.loadComponents(['Vue', 'ParcelForwarding'], {'Vue': kickoffParcelForwarding, 'ParcelForwarding': kickoffParcelForwarding});
    }
    // 404 unpublish feature
    if (opts.not_found_unpublish && widget.c('Data').getPublishedLangs().length > 0) {
      widget.c('PageChecker').notifyWovnIfNotFound();
    }

    if (widget.c('Data').getOptions().style === "floating custom animated" ||
      widget.c('Data').getOptions().style === "floating custom_transparent animated" ||
      widget.c('Data').getOptions().style === "floating custom fixed" ||
      widget.c('Data').getOptions().style === "floating custom_transparent fixed" ||
      widget.c('Data').getOptions().style === "floating custom" ||
      widget.c('Data').getOptions().style === "floating custom_transparent") {
      var logo = widget.c('Utils').getElementsByClassName(widgetElement, 'wovn-logo wovn-logo--small')
      var newLogo = document.createElement('a');
      newLogo.setAttribute('class', 'wovn-logo wovn-logo--small wovn-logo--custom');

      var newLogoHTML = '<svg id="wovn-logo--floating" class="wovn-logo--floating--custom" viewBox="0 0 246 246" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd"><g id="custom"><g id="Group" fill="#FFFFFF"><polygon id="shape" points="246 0 246 246 0 246"></polygon></g><g id="Group" transform="translate(140.629997, 160) scale(0.7)" fill="#812990" fill-rule="nonzero" stroke="#FFFFFF"><path d="M46.2906707,1.92067992 L0.529407432,59.8165151 L37.782713,59.8165151 L37.782713,74.6036803 L46.2891308,74.6036803 L46.2891308,59.8165151 L55.9335361,59.8165151 L55.9335361,57.8307932 L46.2891308,57.8307932 L46.2891308,1.92067992 L46.2906707,1.92067992 Z M37.767314,57.8307932 L5.9945191,57.8307932 L37.767314,17.7902986 L37.767314,57.8307932 Z" id="Shape" stroke-width="4"></path><path d="M89.0922427,26.9316689 C76.5790002,26.4117388 70.8844432,32.0413777 69.4030576,34.0638178 C69.2844852,34.2268467 69.0488802,34.1592852 69.0504201,33.905195 C69.082758,31.2923259 69.5247099,16.4537551 75.7320542,10.0970952 C84.7651185,0.83969525 101.888827,1.92067992 107.606483,19.7304898 C107.745074,20.1637649 109.619134,20.1211718 109.560618,19.6761469 C109.012413,15.5078935 107.588004,12.0519737 104.097046,8.41246285 C90.4781543,-5.77252347 60.6625747,-1.92592178 60.6625747,40.5174138 C60.6625747,67.2820654 72.1179046,74.3569338 86.2249454,75.1441727 C99.1139239,75.8653187 111.787316,65.321312 111.787316,52.4185262 C111.785776,36.2610366 100.690783,27.4119434 89.0922427,26.9316689 Z M86.3019405,72.8588301 C76.7653284,72.8588301 69.0304014,63.0888436 69.0304014,51.0291084 C69.0304014,38.9767169 76.7637885,29.2023242 86.3019405,29.2023242 C95.8400926,29.2023242 103.57194,38.9767169 103.57194,51.0291084 C103.57194,63.0873749 95.8400926,72.8588301 86.3019405,72.8588301 Z" id="Shape" stroke-width="2"></path></g></g></g></svg>';
      newLogoHTML += '<svg id="wovn-logo--default" xmlns="http://www.w3.org/2000/svg" viewBox="http://j.wovn.io/0 0 396.36 64.73"><circle class="color-dot" cx="http://j.wovn.io/322.58" cy="http://j.wovn.io/53.99" r="10"/><path class="color-letter" id="letter-small-i" d="http://j.wovn.io/M343.84,30.31h9.42a1.16,1.16,0,0,1,1.18,1.18V61.79A1.16,1.16,0,0,1,353.26,63h-9.42a1.16,1.16,0,0,1-1.18-1.18V31.48C342.52,30.89,343.11,30.31,343.84,30.31Z"/><path id="letter-small-o" class="color-letter" d="http://j.wovn.io/M379,29.28a17.36,17.36,0,1,0,17.36,17.36A17.39,17.39,0,0,0,379,29.28Zm0,24.57a7.21,7.21,0,1,1,7.21-7.21A7.22,7.22,0,0,1,379,53.84Z"/><path id="letter-big-W" class="color-letter" d="http://j.wovn.io/M93.48,1.18H78.18a2,2,0,0,0-1.91,1.47L66.7,34.42,56.11,2.35A2.06,2.06,0,0,0,54.34,1H41.4a1.9,1.9,0,0,0-1.77,1.32L29,34.42,19.48,2.65a2,2,0,0,0-1.91-1.47H1.68a1.54,1.54,0,0,0-1.32.74A1.81,1.81,0,0,0,.06,3.38L19.77,62.67A2.06,2.06,0,0,0,21.54,64H34.63a1.85,1.85,0,0,0,1.77-1.32L47.58,30.6,58.76,62.67A2.06,2.06,0,0,0,60.52,64H73.61a1.9,1.9,0,0,0,1.77-1.32L95.09,3.38a1.4,1.4,0,0,0-.29-1.47A1.54,1.54,0,0,0,93.48,1.18Z"/><path id="letter-big-O" class="color-letter" d="http://j.wovn.io/M132,0C113.19,0,98.48,14.27,98.48,32.51s14.71,32.22,33.39,32.22,33.54-14.27,33.54-32.51S150.7,0,132,0Zm14.56,32.51C146.58,41.34,140.26,48,132,48s-14.71-6.77-14.71-15.74,6.18-15.45,14.56-15.45S146.58,23.54,146.58,32.51Z"/><path id="letter-big-V" class="color-letter" d="http://j.wovn.io/M232.06,1.18H215.73a2.09,2.09,0,0,0-1.91,1.32L201,38,188.22,2.5a2.09,2.09,0,0,0-1.91-1.32H169.53a1.54,1.54,0,0,0-1.32.74,1.58,1.58,0,0,0-.15,1.62L191.9,62.82A1.91,1.91,0,0,0,193.66,64h14.12a1.91,1.91,0,0,0,1.77-1.18L233.38,3.53a1.74,1.74,0,0,0-.15-1.47C233,1.44,232.65,1.18,232.06,1.18Z"/><path id="letter-big-N" class="color-letter" d="http://j.wovn.io/M301.05,1.18h-15.3a1.47,1.47,0,0,0-1.47,1.47V32.37L261,1.91a1.81,1.81,0,0,0-1.47-.74H245a1.47,1.47,0,0,0-1.47,1.47V62.52A1.47,1.47,0,0,0,245,64h15.45a1.47,1.47,0,0,0,1.47-1.47V31.63L286,63.26a1.81,1.81,0,0,0,1.47.74h13.53a1.47,1.47,0,0,0,1.47-1.47V2.65A1.47,1.47,0,0,0,301.05,1.18Z"/></svg>';
      newLogo.innerHTML = newLogoHTML;

      var objParent = logo[0].parentNode;
      removeNode(logo[0]);
      objParent.appendChild(newLogo);
    }
  }

  this.build = function() {
    if (!document || !document.body) setTimeout(function () {that.body(options)}, 100);
    removeNode(that.getStandardWidgetElement());

    while (true) {
      var oldStyles = document.getElementsByClassName('wovn-style')
      if (oldStyles.length == 0) {
        break;
      }
      removeNode(oldStyles[0])
    }
    var styles = widget.c('RailsBridge')['widgetStyles']

    that.insertStyles(styles);


    // #TODO: Remove this code once a solution if found for style cache system for widget
    /* --------------- */
    if (widget.c('Data').getOptions().style) {
      var currentStyles = widget.c('Data').getOptions().style.split(' ');
      var currentStylesType = currentStyles[0];

      if (currentStylesType === 'default') {

        that.insertStyles([
          '#wovn-translate-widget[wovn] #wovn-logo-planet {width: 20px;height: 20px;position: absolute;top: 14px;left: 16px;z-index: 2;}',
          '#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links #wovn-logo-planet + .wovn-current-lang {line-height: 1.5;padding: 6px 8px 6px 32px;}'
        ])

        if (widget.c('Data').getOptions().hide_logo) {
          that.insertStyles([
            '#wovn-translate-widget[wovn].hide-logo .wovn-lang-selector .wovn-lang-selector-links #wovn-logo-planet + .wovn-current-lang{ padding: 6px 24px 6px 32px; }'
          ])
        }
      }
      else if (currentStylesType === 'floating') {
        that.insertStyles([
          '#wovn-translate-widget[wovn] #wovn-logo-planet {width: 20px;height: 20px;position: absolute;top: 7px;left: 8px;z-index: 2;}',
          '#wovn-translate-widget[wovn] .wovn-lang-container + .wovn-lang-selector .wovn-lang-selector-links {padding: 9px 32px;}'
        ])

        if (widget.c('Data').getOptions().hide_logo) {
          that.insertStyles([
            '#wovn-translate-widget[wovn].hide-logo .wovn-lang-selector .wovn-lang-selector-links{ padding: 9px 9px 9px 32px!important; }'
          ])
        }
      }
      else if (currentStylesType === 'slate') {
        that.insertStyles([
          '#wovn-translate-widget[wovn] #wovn-logo-planet {width: 20px;height: 20px;position: absolute;top: 7px;left: 6px;z-index: 2;}',
          '#wovn-translate-widget[wovn] .wovn-lang-selector .wovn-lang-selector-links #wovn-logo-planet + .wovn-current-lang {padding: 8px 8px 8px 32px;}'
        ])


        if (widget.c('Data').getOptions().hide_logo) {
          that.insertStyles([
            '#wovn-translate-widget[wovn].hide-logo .wovn-lang-selector .wovn-lang-selector-links #wovn-logo-planet + .wovn-current-lang{ padding: 8px 26px 8px 32px; }'
          ])
        }
      }

      if (currentStyles.length >= 2) {
        var currentStylesColor = currentStyles[1].split('_')[0];
        if (currentStylesColor === 'default') {
          that.insertStyles([
            '#wovn-translate-widget[wovn] #wovn-logo-planet {fill: #c5cfda;}'
          ])
        }
        else {
          that.insertStyles([
            '#wovn-translate-widget[wovn] #wovn-logo-planet {fill: rgba(255, 255, 255, 0.7);}'
          ])
        }
      }
    }
    /* --------------- */

    widgetElement = document.createElement('div');
    widgetElement.id = WIDGET_ID
    widgetElement.setAttribute('wovn', '');
    var _HTML = '<div class="wovn-lang-container">';
        _HTML += '<ul class="wovn-lang-list"></ul>';
        _HTML += '<a class="wovn-logo wovn-logo--big" class="wovn-logo-big" href="http://wovn.io/" target="_blank">';
        _HTML += '<svg xmlns="http://www.w3.org/2000/svg" viewBox="http://j.wovn.io/0 0 396.36 64.73"><circle class="color-dot" cx="http://j.wovn.io/322.58" cy="http://j.wovn.io/53.99" r="10"/><path class="color-letter" id="letter-small-i" d="http://j.wovn.io/M343.84,30.31h9.42a1.16,1.16,0,0,1,1.18,1.18V61.79A1.16,1.16,0,0,1,353.26,63h-9.42a1.16,1.16,0,0,1-1.18-1.18V31.48C342.52,30.89,343.11,30.31,343.84,30.31Z"/><path id="letter-small-o" class="color-letter" d="http://j.wovn.io/M379,29.28a17.36,17.36,0,1,0,17.36,17.36A17.39,17.39,0,0,0,379,29.28Zm0,24.57a7.21,7.21,0,1,1,7.21-7.21A7.22,7.22,0,0,1,379,53.84Z"/><path id="letter-big-W" class="color-letter" d="http://j.wovn.io/M93.48,1.18H78.18a2,2,0,0,0-1.91,1.47L66.7,34.42,56.11,2.35A2.06,2.06,0,0,0,54.34,1H41.4a1.9,1.9,0,0,0-1.77,1.32L29,34.42,19.48,2.65a2,2,0,0,0-1.91-1.47H1.68a1.54,1.54,0,0,0-1.32.74A1.81,1.81,0,0,0,.06,3.38L19.77,62.67A2.06,2.06,0,0,0,21.54,64H34.63a1.85,1.85,0,0,0,1.77-1.32L47.58,30.6,58.76,62.67A2.06,2.06,0,0,0,60.52,64H73.61a1.9,1.9,0,0,0,1.77-1.32L95.09,3.38a1.4,1.4,0,0,0-.29-1.47A1.54,1.54,0,0,0,93.48,1.18Z"/><path id="letter-big-O" class="color-letter" d="http://j.wovn.io/M132,0C113.19,0,98.48,14.27,98.48,32.51s14.71,32.22,33.39,32.22,33.54-14.27,33.54-32.51S150.7,0,132,0Zm14.56,32.51C146.58,41.34,140.26,48,132,48s-14.71-6.77-14.71-15.74,6.18-15.45,14.56-15.45S146.58,23.54,146.58,32.51Z"/><path id="letter-big-V" class="color-letter" d="http://j.wovn.io/M232.06,1.18H215.73a2.09,2.09,0,0,0-1.91,1.32L201,38,188.22,2.5a2.09,2.09,0,0,0-1.91-1.32H169.53a1.54,1.54,0,0,0-1.32.74,1.58,1.58,0,0,0-.15,1.62L191.9,62.82A1.91,1.91,0,0,0,193.66,64h14.12a1.91,1.91,0,0,0,1.77-1.18L233.38,3.53a1.74,1.74,0,0,0-.15-1.47C233,1.44,232.65,1.18,232.06,1.18Z"/><path id="letter-big-N" class="color-letter" d="http://j.wovn.io/M301.05,1.18h-15.3a1.47,1.47,0,0,0-1.47,1.47V32.37L261,1.91a1.81,1.81,0,0,0-1.47-.74H245a1.47,1.47,0,0,0-1.47,1.47V62.52A1.47,1.47,0,0,0,245,64h15.45a1.47,1.47,0,0,0,1.47-1.47V31.63L286,63.26a1.81,1.81,0,0,0,1.47.74h13.53a1.47,1.47,0,0,0,1.47-1.47V2.65A1.47,1.47,0,0,0,301.05,1.18Z"/></svg>';
        _HTML += '</a>';
        _HTML += '</div>';
        _HTML += '<div class="wovn-lang-selector">';
        _HTML += '<div class="wovn-lang-selector-links">'
        _HTML += '<svg id="wovn-logo-planet" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M14.2588,19.6699 C15.1168,18.6319 15.8108,17.4539 16.2858,16.1669 L18.8168,16.1669 C17.7908,17.8369 16.1768,19.1039 14.2588,19.6699 Z M5.1838,16.1669 L7.7138,16.1669 C8.1898,17.4539 8.8828,18.6319 9.7408,19.6699 C7.8228,19.1039 6.2088,17.8369 5.1838,16.1669 Z M9.7408,4.3299 C8.8458,5.4119 8.1388,6.6489 7.6618,7.9999 L5.0818,7.9999 C6.0998,6.2469 7.7598,4.9149 9.7408,4.3299 Z M18.9178,7.9999 L16.3378,7.9999 C15.8618,6.6489 15.1548,5.4119 14.2588,4.3299 C16.2398,4.9149 17.9008,6.2469 18.9178,7.9999 Z M16.8488,9.9999 L19.7368,9.9999 C19.9028,10.6409 19.9998,11.3089 19.9998,11.9999 C19.9998,12.7519 19.8888,13.4769 19.6938,14.1669 L16.8178,14.1669 C16.9468,13.4619 17.0348,12.7429 17.0348,11.9999 C17.0348,11.3159 16.9578,10.6519 16.8488,9.9999 Z M14.1938,7.9999 L9.8068,7.9999 C10.3238,6.8139 11.0648,5.7249 11.9998,4.8069 C12.9358,5.7249 13.6758,6.8139 14.1938,7.9999 Z M3.9998,11.9999 C3.9998,11.3089 4.0978,10.6409 4.2638,9.9999 L7.1518,9.9999 C7.0418,10.6519 6.9648,11.3159 6.9648,11.9999 C6.9648,12.7429 7.0538,13.4619 7.1828,14.1669 L4.3068,14.1669 C4.1118,13.4769 3.9998,12.7519 3.9998,11.9999 Z M9.2108,14.1669 C9.0538,13.4599 8.9648,12.7349 8.9648,11.9999 C8.9648,11.3229 9.0348,10.6529 9.1688,9.9999 L14.8308,9.9999 C14.9648,10.6529 15.0348,11.3229 15.0348,11.9999 C15.0348,12.7349 14.9458,13.4599 14.7888,14.1669 L9.2108,14.1669 Z M9.8868,16.1669 L14.1128,16.1669 C13.5998,17.2879 12.8918,18.3189 11.9998,19.1929 C11.1088,18.3189 10.4008,17.2879 9.8868,16.1669 Z M1.9998,11.9999 C1.9998,17.5229 6.4778,21.9999 11.9998,21.9999 C17.5228,21.9999 21.9998,17.5229 21.9998,11.9999 C21.9998,6.4769 17.5228,1.9999 11.9998,1.9999 C6.4778,1.9999 1.9998,6.4769 1.9998,11.9999 Z"></path></svg>';
        _HTML += '<span class="wovn-current-lang">Loading...</span>';
        _HTML += '<a class="wovn-logo wovn-logo--small" href="http://wovn.io/" target="_blank">';
        _HTML += '<svg id="wovn-logo--floating" xmlns="http://www.w3.org/2000/svg" viewBox="http://j.wovn.io/0 0 66.96 39.35"><circle class="color-dot" cx="http://j.wovn.io/60.71" cy="33.1" r="http://j.wovn.io/6.25"/><path class="color-letter" d="http://j.wovn.io/M58.42.09H48.86a1.27,1.27,0,0,0-1.2.92l-6,19.86L35.06.83A1.29,1.29,0,0,0,34,0H25.87a1.19,1.19,0,0,0-1.1.83l-6.62,20L12.17,1A1.27,1.27,0,0,0,11,.09H1A1,1,0,0,0,.22.55,1.13,1.13,0,0,0,0,1.47L12.36,38.52a1.29,1.29,0,0,0,1.1.83h8.18a1.16,1.16,0,0,0,1.1-.83l7-20,7,20a1.29,1.29,0,0,0,1.1.83H46a1.19,1.19,0,0,0,1.1-.83L59.43,1.47a.88.88,0,0,0-.18-.92A1,1,0,0,0,58.42.09Z"/></svg>';
        _HTML += '<svg id="wovn-logo--default" xmlns="http://www.w3.org/2000/svg" viewBox="http://j.wovn.io/0 0 396.36 64.73"><circle class="color-dot" cx="http://j.wovn.io/322.58" cy="http://j.wovn.io/53.99" r="10"/><path class="color-letter" id="letter-small-i" d="http://j.wovn.io/M343.84,30.31h9.42a1.16,1.16,0,0,1,1.18,1.18V61.79A1.16,1.16,0,0,1,353.26,63h-9.42a1.16,1.16,0,0,1-1.18-1.18V31.48C342.52,30.89,343.11,30.31,343.84,30.31Z"/><path id="letter-small-o" class="color-letter" d="http://j.wovn.io/M379,29.28a17.36,17.36,0,1,0,17.36,17.36A17.39,17.39,0,0,0,379,29.28Zm0,24.57a7.21,7.21,0,1,1,7.21-7.21A7.22,7.22,0,0,1,379,53.84Z"/><path id="letter-big-W" class="color-letter" d="http://j.wovn.io/M93.48,1.18H78.18a2,2,0,0,0-1.91,1.47L66.7,34.42,56.11,2.35A2.06,2.06,0,0,0,54.34,1H41.4a1.9,1.9,0,0,0-1.77,1.32L29,34.42,19.48,2.65a2,2,0,0,0-1.91-1.47H1.68a1.54,1.54,0,0,0-1.32.74A1.81,1.81,0,0,0,.06,3.38L19.77,62.67A2.06,2.06,0,0,0,21.54,64H34.63a1.85,1.85,0,0,0,1.77-1.32L47.58,30.6,58.76,62.67A2.06,2.06,0,0,0,60.52,64H73.61a1.9,1.9,0,0,0,1.77-1.32L95.09,3.38a1.4,1.4,0,0,0-.29-1.47A1.54,1.54,0,0,0,93.48,1.18Z"/><path id="letter-big-O" class="color-letter" d="http://j.wovn.io/M132,0C113.19,0,98.48,14.27,98.48,32.51s14.71,32.22,33.39,32.22,33.54-14.27,33.54-32.51S150.7,0,132,0Zm14.56,32.51C146.58,41.34,140.26,48,132,48s-14.71-6.77-14.71-15.74,6.18-15.45,14.56-15.45S146.58,23.54,146.58,32.51Z"/><path id="letter-big-V" class="color-letter" d="http://j.wovn.io/M232.06,1.18H215.73a2.09,2.09,0,0,0-1.91,1.32L201,38,188.22,2.5a2.09,2.09,0,0,0-1.91-1.32H169.53a1.54,1.54,0,0,0-1.32.74,1.58,1.58,0,0,0-.15,1.62L191.9,62.82A1.91,1.91,0,0,0,193.66,64h14.12a1.91,1.91,0,0,0,1.77-1.18L233.38,3.53a1.74,1.74,0,0,0-.15-1.47C233,1.44,232.65,1.18,232.06,1.18Z"/><path id="letter-big-N" class="color-letter" d="http://j.wovn.io/M301.05,1.18h-15.3a1.47,1.47,0,0,0-1.47,1.47V32.37L261,1.91a1.81,1.81,0,0,0-1.47-.74H245a1.47,1.47,0,0,0-1.47,1.47V62.52A1.47,1.47,0,0,0,245,64h15.45a1.47,1.47,0,0,0,1.47-1.47V31.63L286,63.26a1.81,1.81,0,0,0,1.47.74h13.53a1.47,1.47,0,0,0,1.47-1.47V2.65A1.47,1.47,0,0,0,301.05,1.18Z"/></svg>';
        _HTML += '</a>';
        _HTML += '</div>';
        _HTML += '<span id="translated-by-machine">Translated by machine</span>';
        _HTML += '</div>';

    widgetElement.innerHTML = _HTML;
    document.body.appendChild(widgetElement);
    appendedChildren.push(widgetElement);

    var clickCatcher = document.createElement('div');
    clickCatcher.setAttribute('style', 'z-index:9999999999;position:fixed;display:none;top:0;right:0;bottom:0;left:0;background:transparent;pointer-events: auto;');
    clickCatcher.setAttribute('class', 'wovn-click-catcher');
    onEvent(clickCatcher, 'click', closeDropDown);
    widgetElement.parentNode.insertBefore(clickCatcher, widgetElement);

    var dropDownButton = widgetElement.getElementsByClassName('wovn-lang-selector')[0];
    var langListContainer = widgetElement.getElementsByClassName('wovn-lang-container')[0];

    setTimeout(function() {
      animShowWidget(widgetElement);
    }, 1000);

    if (widget.c('Agent').isMobile()) {
      widgetElement.className += ' mobile slide-out';

      onEvent(window, 'scroll', scrollWidgetAction);
      this.scrollStop(scrollStopWidgetAction);

      if (!widget.c('Utils').pageIsWidgetPreview()) {
        onHoldAnim = setTimeout(function() {
          animHideWidget(widgetElement);
        }, 5000);
      }
    }

    onEvent(dropDownButton, 'click', openDropDown);
    onEvent(langListContainer, 'click', closeDropDown);

    function openDropDown () {
      if(onHoldAnim !== null) clearTimeout(onHoldAnim);
      var e = arguments[0] || window.event;
      if (e.stopPropagation)
        e.stopPropagation();
      else
        e.returnValue = false;
      if (that.hasClass(langListContainer, 'is-open')) {
        that.removeClass(langListContainer, 'is-open');
        clickCatcher.style.display = 'none';
      }
      else {
        that.addClass(langListContainer, 'is-open');
        clickCatcher.style.display = 'block';
      }
    }

    function closeDropDown () {
      onHoldAnim = setTimeout(function() {
        animHideWidget(widgetElement);
      }, 4000);

      var e = arguments[0] || window.event;
      if (e.stopPropagation)
        e.stopPropagation();
      else
        e.returnValue = false;
      that.removeClass(langListContainer, 'is-open');
      clickCatcher.style.display = 'none';
    }

    widgetElement.setAttribute('data-ready', widget.tag.getAttribute('data-wovnio') + '&ready=true');
    applyWidgetOptions();
    that.refresh(widgetElement);
  };

  this._getWidgetElements = function () {
    return [this.getStandardWidgetElement()]
      .concat(this._getCustomWidgetElements())
      .filter(function (e) { return e !== null; });
  };

  this.getStandardWidgetElement = function () {
    return document.getElementById(WIDGET_ID);
  };

  this._getCustomWidgetElements = function () {
    return widget.c('Utils').toArrayFromDomList(document.querySelectorAll('#' + CUSTOM_WIDGET_ID + ',.' + CUSTOM_WIDGET_ID));
  };

  var clearWidgetLangList = function() {
    that._getWidgetElements().forEach(function (widgetElement) {
      var listItems = widget.c('Utils').toArrayFromDomList(widgetElement.getElementsByTagName('li'));
      for (var i = 0; i < listItems.length; ++i) {
        removeNode(listItems[i]); 
      }
    }, that);
  };

  this.refresh = function () {
    this._getWidgetElements().forEach(function (widgetElement) {
      // TODO: reset the lang list and/or remove unused/duplicate languages
      if (wovnGetElementsByClassName(widgetElement, 'wovn-switch').length === 0) {
        buildWidgetLangList(widgetElement, widget.c('Data').getConvertedLangs());
        attachLangClickHandlers(widgetElement);
      }

      if (this.shouldShowWidget(widgetElement)) {
        // TODO: THIS SEEMS LIKE THE WRONG WAY TO DO THIS?
        if (!widget.c('Url').isLiveEditor()) {
          widgetElement.style.display = 'block';
        }
        disableBrowserTranslation();
      }
      else {
        widgetElement.style.display = 'none';
      }
    }, that);
  };

  this.shouldShowWidget = function(widgetElement) {
    return wovnGetElementsByClassName(widgetElement, 'wovn-switch').length > 1 &&
      !widget.c('ValueStore').empty() &&
      !widget.c('Data').hasDomainPrecacheFeature() &&
      !widget.c('Data').hasEmptyOriginalOptions();
  }
  /**
   * start wovn's main function
   * @param {Function} callback called when succeed
   */
  this.start = function(callback) {
    // if the browser is a web crawler, do nothing
    if (widget.c('Agent').isCrawler()) return;
    // shims
    widget.c('Utils');
    // loads API
    widget.c('Api');
    // load data
    loadData(init);
    widget.c('PerformanceMonitor').mark('data_load_script_insert');

    function init () {
      if (!widget.c('Data').getImageValues) widget.c('Data').getImageValues = function() {return {}};
      if (!widget.c('Data').getTextValues) widget.c('Data').getTextValues = function() {return {}};

      widget.c('PerformanceMonitor').mark('data_load_end');

      if (widget.c('Data').useImmediateWidget() || widget.c('DomAuditor').mustEnsureOneReport()) {
        widget.c('Utils').onDomReady(widgetOnLoadedDocument, true);
      } else {
        widget.c('Utils').onLoadingComplete(widgetOnLoadedDocument);
      }

      // waits for the page to be loaded before creating the widget
      function widgetOnLoadedDocument() {
        if (widget.c('Data').hasNoAutomaticRedirection()) {
          // hide unpublished translation texts for change swapLangs to replace links and whatever
          var langs = widget.c('Data').getPublishedLangs()
          widget.c('TranslationDataBridge').onlyShowLangs(langs)
          // stop dymanic loading for only replace links
          widget.disableLoadTranslation()
        }
        _widgetOnLoadedDocument()
      }

      function _widgetOnLoadedDocument() {
        insertHreflangLinks();
        // lang will set doc lang
        if (!widget.c('Data').useWidgetManualStartFeature()) {
          that.build();
          if (widget.c('Url').isLiveEditor()) {
            // Use original language for LiveEditor's initialization.
            widget.c('Lang').setDocLang(widget.c('Data').getLang());
          }
          else {
            widget.c('Lang').setDocLang();
          }
          widget.c('AuditTrigger').start();
        }

        widget.c('SPA').listen();
        widget.c('Api').makeReady();
        widget.c('TagCustomization').load();
        if (widget.c('Data').useMachineTranslatedModal()) {
          var loadedOne = false;
          function kickoffModal () {
            if (loadedOne) {
              var manualLangChange = false
              widget.c('MachineTranslatedModal').start(manualLangChange);
            }
            else {
              loadedOne = true;
            }
          }
          widget.loadComponents(['Vue', 'MachineTranslatedModal'], {'Vue': kickoffModal, 'MachineTranslatedModal': kickoffModal});
        }

        widget.c('PerformanceMonitor').mark('first_translation_finish');

        if (widget.c('Url').isLiveEditor()) {
          that._loadLiveEditor();
        } else if (widget.c('Data').hasWidgetSessionFeature()) {
          var sessionListener = { 'target': document, 'eventName': 'wovnSessionReady', 'handler': addSessionTools }

          widget.c('Utils').onEvent(sessionListener.target, sessionListener.eventName, sessionListener.handler)
          attachedHandlers.push(sessionListener);
          widget.c('SessionProxy').start()
        }

        if (callback) callback();
      }
    }
  };

  /**
   * Add the hreflang tags to the page
   */
  function insertHreflangLinks() {
    var prerender_io = widget.c('Data').getOptions().prerender_io;
    if (prerender_io) {
      widget.c('Data').updateOptions({lang_path: 'query'})
    }
    var langPath = widget.c('Data').getOptions().lang_path;
    if (!widget.isBackend() && (langPath === 'query' || langPath === 'path' || langPath === 'subdomain' || langPath === 'custom_domain')) {
      var defaultCode = widget.c('Lang').getDefaultCodeIfExists();
      // Must not be called before load page.
      if (!defaultCode) return;

      var availableLanguages = widget.c('Data').getPublishedLangs();
      availableLanguages.push(defaultCode);
      var insertionLocation = document.getElementsByTagName('head').length > 0 ? document.getElementsByTagName('head')[0] : null;

      if (insertionLocation) {
        for(var i = 0; i < availableLanguages.length; i++) {
          if (availableLanguages[i]) {
            var langUrl = widget.c('Url').getUrl(availableLanguages[i], document.location.href);
            var link = document.createElement('link');
            link.rel = 'alternate';
            link.hreflang = widget.c('Lang').iso6391Normalization(availableLanguages[i]);
            link.href = langUrl;
            insertionLocation.appendChild(link);
          }
        }
      }
    }
  }

  /**
   * get Data-related data and callback when all information collected
   * @param {Function} callback called when all information collected
   */
  function loadData(callback) {
    var remainCount = 2;

    var optionData = {};

    that.loadData(function(data) {
      widget.c('Data').set(data);
      successCallback();
    })

    widget.loadDomainOption(function(option) {
      optionData = option;
      successCallback();
    }, function() {});

    // if error occured, callback won't executed.
    function successCallback() {
      remainCount--;

      if (remainCount == 0) {
        widget.c('Data').setOptions(optionData);
        callback();
      }
    }
  }

  this.loadData = function (callback) {
    var isLiveEditor = widget.c('Url').isLiveEditor();
    if (isLiveEditor) {
      widget.loadLiveEditorSavedData(function(data) {
        callback(data);
      }, function() {
        alert("Failed to load wovn's data. please reload.")
      });
    } else {
      setPreviewCookieIfExist();
      var signature = getPreviewSignature();
      if (signature) {
        widget.loadPreviewData(signature, callback, function() {
          widget.loadDataJson(callback)
        });
      } else {
        widget.loadDataJson(function(data) {
          callback(data);
        });
      }
    }
  }

  this.isWidgetElement = function (node) {
    return that.isStandardWidgetElement(node) || that.isCustomWidgetElement(node);
        
  }

  this.isStandardWidgetElement = function (node) {
    return node.id === WIDGET_ID;
  }

  this.isCustomWidgetElement = function (node) {
    var className = node.getAttribute ? node.getAttribute('class') : null;
    return node.id === CUSTOM_WIDGET_ID
        || className && !!className.match(new RegExp('(^|\\s)' + CUSTOM_WIDGET_ID + '($|\\s)', 'i'));
  }

  /**
   * Reload Data component for SPA
   */
  this.reload = function() {
    var options = widget.c('Data').getOptions();
    widget.c('DomAuditor').stop();
    widget.c('AuditTrigger').stop();
    widget.c('SPA').stop();
    widget.reloadData(function(data) {
      // Set options simultaneously to avoid race condition.
      data['widgetOptions'] = options;
      widget.c('Data').set(data);
      widget.reinstallComponent('ValueStore');
      widget.reinstallComponent('AuditTrigger');
      widget.reinstallComponent('DomAuditor');
      if (!widget.c('Data').hasSpaStopClearingWidgetLanguages()) {
        clearWidgetLangList();
      }

      // single page application frameworks like Turbolinks might remove the
      // widget, so we must rebuild it if it must be displayed (widgetElement is
      // set) and if it was removed from the DOM
      if (widgetElement && !that.getStandardWidgetElement()) {
        that.build()
      }

      that.refresh();
      widget.c('AuditTrigger').start();
      widget.c('TagCustomization').load();
      widget.c('SPA').listen();
    });
  };

  this.destroy = function () {
    for (var i = 0; i < attachedHandlers.length; i++) {
      widget.c('Utils').removeHandler(attachedHandlers[i].target, attachedHandlers[i].eventName, attachedHandlers[i].handler);
    }
    for (var i = 0; i < appendedChildren.length; i++) {
      removeNode(appendedChildren[i]);
      removeNode(document.querySelector('.wovn-live-edit-button'));
    }
  };

  function removeNode(node) {
    if (node && node.parentNode) {
      node.parentNode.removeChild(node);
    }
  }

  // for preview mode
  var preview_cookie_name = 'wovn_preview_signature';

  function setPreviewCookieIfExist() {
    var cookie = widget.c('Cookie');
    var match = location.search.match(/wovn_preview_signature=([^&]+)/);
    if (match) {
      var signature = match[1];
      cookie.set(preview_cookie_name, signature, null, '');
    }
  }

  function getPreviewSignature() {
    return widget.c('Cookie').get(preview_cookie_name);
  }

  function addSessionTools() {
    var wovnHost = widget.c('RailsBridge').wovnHost.replace(/\/$/, '')
    var translatePageUrl = wovnHost + '/pages/translate?page=' + widget.c('Data').getPageId()

    setWovnLink(translatePageUrl)
    addEditButton(function () {
      widget.c('SessionProxy').sendRequest('POST', '/in_page/sessions', null, function (response) {
        var liveEditorHash = '&wovn.targetLang=' + widget.c('Lang').getCurrentLang() + '&wovn.editing=' + response.token

        location.hash += liveEditorHash
        location.reload()
      })
    })
  }

  function setWovnLink(href) {
    var widgetElement = that.getStandardWidgetElement();

    if (widgetElement) {
      var wovnLinkElements = widgetElement.querySelectorAll('a.wovn-logo')

      for (var i = 0; i < wovnLinkElements.length; ++i) {
        wovnLinkElements[i].href = href
      }
    }
  }

  function addEditButton(action) {
    var widgetElements = that._getWidgetElements()
    var widgetElement = widgetElements[0];

    if (widgetElement) {
      var editButtonElement = document.createElement('button')
      var positions = getWidgetPositions(widgetElement)

      var liveEditButtonHTML = '<svg id="wovn-live-edit-button-logo" viewBox="0 0 27 17" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M24.5806923,11.1909615 C25.9083846,11.1909615 26.9853077,12.2675 26.9853077,13.5951923 C26.9853077,14.9236538 25.9083846,15.9998077 24.5806923,15.9998077 C23.2526154,15.9998077 22.1760769,14.9236538 22.1760769,13.5951923 C22.1760769,12.2675 23.2526154,11.1909615 24.5806923,11.1909615" fill="#38B171"></path><path d="M23.36712,0.3153925 L19.54192,0.3153925 C19.32192,0.3153925 19.13792,0.4717925 19.06432,0.7059675 L16.67392,9.1460425 L14.02592,0.6277675 C13.95232,0.4326925 13.76872,0.2762925 13.58472,0.2762925 L10.34832,0.2762925 C10.12752,0.2762925 9.98072,0.4326925 9.90712,0.6277675 L7.25912,9.1460425 L4.86872,0.7059675 C4.79512,0.4717925 4.61112,0.3153925 4.39072,0.3153925 L0.41912,0.3153925 C0.27192,0.3153925 0.16152,0.3935925 0.08792,0.5104675 C0.01432,0.6277675 -0.02248,0.7841675 0.01432,0.9014675 L4.94232,16.6485675 C5.01592,16.8436425 5.19992,17.0000425 5.38352,17.0000425 L8.65672,17.0000425 C8.84072,17.0000425 9.02472,16.8827425 9.09792,16.6485675 L11.89272,8.1302925 L14.68792,16.6485675 C14.76112,16.8436425 14.94512,17.0000425 15.12912,17.0000425 L18.40232,17.0000425 C18.62312,17.0000425 18.76992,16.8436425 18.84352,16.6485675 L23.77152,0.9014675 C23.80832,0.7841675 23.80832,0.6277675 23.69792,0.5104675 C23.62472,0.3935925 23.51392,0.3153925 23.36712,0.3153925" fill="#FFFFFF"></path></svg>'
      liveEditButtonHTML += '<span>Live Editor</span>'
      liveEditButtonHTML += '<svg id="wovn-live-edit-button-arrow" viewBox="0 0 24 24" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><path d="M8.41421356,11 L18,11 C18.5522847,11 19,11.4477153 19,12 C19,12.5522847 18.5522847,13 18,13 L8.41421356,13 L11.7071068,16.2928932 C12.0976311,16.6834175 12.0976311,17.3165825 11.7071068,17.7071068 C11.3165825,18.0976311 10.6834175,18.0976311 10.2928932,17.7071068 L5.29289322,12.7071068 C4.90236893,12.3165825 4.90236893,11.6834175 5.29289322,11.2928932 L10.2928932,6.29289322 C10.6834175,5.90236893 11.3165825,5.90236893 11.7071068,6.29289322 C12.0976311,6.68341751 12.0976311,7.31658249 11.7071068,7.70710678 L8.41421356,11 Z" fill-rule="nonzero" transform="translate(12.000000, 12.000000) scale(-1, 1) translate(-12.000000, -12.000000) "></path></svg>'

      editButtonElement.className = 'wovn-live-edit-button'
      editButtonElement.setAttribute('wovn', '')
      editButtonElement.innerHTML = liveEditButtonHTML
      editButtonElement.onclick = action

      that.insertStyles([
        '.wovn-live-edit-button[wovn] {-webkit-tap-highlight-color: transparent;-webkit-font-smoothing: antialiased;animation : none;animation-delay : 0;animation-direction : normal;animation-duration : 0;animation-fill-mode : none;animation-iteration-count : 1;animation-name : none;animation-play-state : running;animation-timing-function : ease;backface-visibility : visible;background : 0;background-attachment : scroll;background-clip : border-box;background-color : transparent;background-image : none;background-origin : padding-box;background-position : 0 0;background-position-x : 0;background-position-y : 0;background-repeat : repeat;background-size : auto auto;border : 0;border-style : none;border-width : medium;border-color : inherit;border-bottom : 0;border-bottom-color : inherit;border-bottom-left-radius : 0;border-bottom-right-radius : 0;border-bottom-style : none;border-bottom-width : medium;border-collapse : separate;border-image : none;border-left : 0;border-left-color : inherit;border-left-style : none;border-left-width : medium;border-radius : 0;border-right : 0;border-right-color : inherit;border-right-style : none;border-right-width : medium;border-spacing : 0;border-top : 0;border-top-color : inherit;border-top-left-radius : 0;border-top-right-radius : 0;border-top-style : none;border-top-width : medium;bottom : auto;box-shadow : none;box-sizing : content-box;caption-side : top;clear : none;clip : auto;color : inherit;columns : auto;column-count : auto;column-fill : balance;column-gap : normal;column-rule : medium none currentColor;column-rule-color : currentColor;column-rule-style : none;column-rule-width : none;column-span : 1;column-width : auto;content : normal;counter-increment : none;counter-reset : none;cursor : auto;direction : ltr;display : inline;empty-cells : show;float : none;font : normal;font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell, "Helvetica Neue", "ヒラギノ角ゴ Pro W3", "Hiragino Kaku Gothic Pro", Osaka, "メイリオ", Meiryo, "ＭＳ Ｐゴシック", "MS PGothic", Padauk, sans-serif;font-size : medium;font-style : normal;font-variant : normal;font-weight : normal;height : auto;hyphens : none;left : auto;letter-spacing : normal;line-height : normal;list-style: none;list-style-image : none;list-style-position : inside;list-style-type : none;margin : 0;margin-bottom : 0;margin-left : 0;margin-right : 0;margin-top : 0;max-height : none;max-width : none;min-height : 0;min-width : 0;opacity : 1;orphans : 0;outline : 0;outline-color : invert;outline-style : none;outline-width : medium;overflow : visible;overflow-x : visible;overflow-y : visible;padding : 0;padding-bottom : 0;padding-left : 0;padding-right : 0;padding-top : 0;page-break-after : auto;page-break-before : auto;page-break-inside : auto;perspective : none;perspective-origin : 50% 50%;position : static; right : auto;tab-size : 8;table-layout : auto;text-align : inherit;text-align-last : auto;text-decoration : none;text-decoration-color : inherit;text-decoration-line : none;text-decoration-style : solid;text-indent : 0;text-shadow : none;text-transform : none;top : auto;transform : none;transform-style : flat;transition : none;transition-delay : 0s;transition-duration : 0s;transition-property : none;transition-timing-function : ease;unicode-bidi : normal;vertical-align : baseline;visibility : visible;white-space: nowrap;widows : 0;width : auto;word-spacing : normal;z-index : auto;}'
      ])

      that.insertStyles([
        '.wovn-live-edit-button[wovn] { cursor: pointer; border: none; display: block; background-color: #394045; padding: 4px 4px 4px 8px; border-radius: 3px; box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.2);}',
        '.wovn-live-edit-button[wovn] #wovn-live-edit-button-logo { pointer-events: none; margin: 0 6px 0 0; width: 16px; height: 10px; display: inline-block; vertical-align: middle;}',
        '#wovn-translate-widget[wovn] .wovn-live-edit-button[wovn] span { pointer-events: none;line-height: 0; font-weight: 500; margin: 0 4px 0 0; display: inline-block; vertical-align: middle; font-size: 11px; color: #ffffff}',
        '.wovn-live-edit-button[wovn] #wovn-live-edit-button-arrow { pointer-events: none;width: 16px; height: 16px; fill: #ffffff; display: inline-block; vertical-align: middle;}'
      ])


      var currentStyles = widget.c('Data').getOptions().style.split(' ');
      var currentStylesType = currentStyles[0];

      if (currentStylesType === 'floating') {
        that.insertStyles([
          '.wovn-live-edit-button[wovn] { margin: 0; }'
        ])
      }
      else {
        if (positions.left === 'left') {
          that.insertStyles([
            '.wovn-live-edit-button[wovn] { margin: 0 auto 0 8px; }'
          ])
        }
        else {
          that.insertStyles([
            '.wovn-live-edit-button[wovn] { margin: 0 8px 0 auto; }'
          ])
        }
      }
      if (widgetElements.length > 0) {
        that.insertStyles([
          '.wovn-live-edit-button[wovn] { position: fixed; bottom: 32px; right: 8px; }',
          '.wovn-live-edit-button[wovn] span { pointer-events: none;line-height: 0; font-weight: 500; margin: 0 4px 0 0; display: inline-block; vertical-align: middle; font-size: 11px; color: #ffffff}',
        ])
        document.body.appendChild(editButtonElement)
      }
      else {
        if (positions.top === 'top') {
          that.insertStyles([
            '.wovn-live-edit-button[wovn] { margin-top: 8px; }'
          ])
          widgetElement.appendChild(editButtonElement)
        }
        else {
          that.insertStyles([
            '.wovn-live-edit-button[wovn] { margin-bottom: 8px; }'
          ])
          widgetElement.insertBefore(editButtonElement, widgetElement.firstChild)
        }
      }
    }
  }

  function getWidgetPositions(currentWidget) {
    switch (true) {
      case that.hasClass(currentWidget, 'position-bottom-right'):
        return {top: 'bottom', left: 'right'}
        break
      case that.hasClass(currentWidget, 'position-bottom-left'):
        return {top: 'bottom', left: 'left'}
        break
      case that.hasClass(currentWidget, 'position-top-right'):
        return {top: 'top', left: 'right'}
        break
      case that.hasClass(currentWidget, 'position-top-left'):
        return {top: 'top', left: 'left'}
        break
      default:
        return {top: 'bottom', left: 'right'}
        break
    }
  }
};

if (typeof(components) === 'undefined') var components = {};
components['Api'] = function (widget) {
  var that = this;
  var apiReady = false;

  // dispatched when language is changed
  var langChangedEvent = widget.c('Utils').createInitEvent('wovnLangChanged', true, true);

  // dispatched when WOVN API is ready
  var wovnApiReadyEvent = widget.c('Utils').createInitEvent('wovnApiReady', true, true);

  // Create WOVN.io object
  WOVN = {};
  WOVN.io = {};

  WOVN.io.changeLang = function (lang) {
    if (!apiReady) return false;

    var langCode = widget.c('Lang').getCode(lang);

    // invalid lang
    if (!langCode) return false;

    widget.c('Interface').changeLangByCode(langCode, function(newLang) {
      widget.c('Url').changeUrl(newLang)
    });
    return true;
  };

  WOVN.io.getCurrentLang = function () {
    return getCurrentLang();
  };

  WOVN.io.getWovnUrl = function (url) {
    if (!apiReady) return widget.c('Url').getLocation(url).href;

    var lang = widget.c('Lang').getActualLang()
    return widget.c('Url').getUrl(lang, url)
  }

  WOVN.io.swap = function(element) {
    if (!apiReady) return;

    var lang = getCurrentLang()
    if (!lang) return

    var langCode = lang.code
    if (element) {
      widget.c('DomAuditor').swapVals(langCode, {head: element}, true)
    } else {
      widget.c('DomAuditor').swapVals(langCode, {}, true)
    }
  }

  WOVN.io.manualStart = function () {
    if (apiReady) {
      widget.c('Interface').build();
      widget.c('Lang').setDocLang();
      widget.c('AuditTrigger').start();
    }
    else {
      window.addEventListener('wovnApiReady', function(evt) {
        widget.c('Interface').build();
        widget.c('Lang').setDocLang();
        widget.c('AuditTrigger').start();
      })
    }
  }

  WOVN.io.translateTexts = function(fromLang, toLang, texts) {
    if (!apiReady) {
      var defaultTexts = {};
      for (var i = 0; i < texts.length; i++) {
        defaultTexts[texts[i]] = texts[i];
      }
      return defaultTexts;
    }

    return widget.c('ValueStore').translateTexts(fromLang, toLang, texts);
  }

  WOVN.io.ruleBaseTranslation = function(fromLang, toLang, text) {
    if (!apiReady) {
      return {}
    }
    return widget.c('RuleBaseTranslation').translate(fromLang, toLang, text)
  }

  WOVN.io.dynamicTranslate = function(toLangCode, src, callback, errorCallback) {
    widget.c('InstantTranslation').translate(toLangCode, src, callback, errorCallback)
  }

  WOVN.io.search = function (query, language, callback, errorCallback) {
    if (!errorCallback) {
      throw new Error('errorCallback is required')
    }

    if (!callback) {
      errorCallback('callback is required')
      return
    }

    if (!language) {
      errorCallback('language is required')
      return
    }
    if (!query) {
      errorCallback('query is required')
      return
    }

    if (!language) errorCallback('language is required')
    widget.c('InSiteSearcher').search(query, language, callback, errorCallback)
  }

  function isApiReady() {
    return apiReady
  }

  WOVN.io._private = {
    widget: widget,
    isApiReady: isApiReady
  }

  this.dispatchLangChangedEvent = function () {
    widget.c('Utils').dispatchEvent(langChangedEvent);
  };

  function getCurrentLang() {
    if (!apiReady) return widget.c('Lang').get('en');

    return widget.c('Lang').get(widget.c('Lang').getActualLang());
  }

  // Create Wovnio object for backwards compatibility
  Wovnio = WOVN.io;

  this.makeReady = function () {
    apiReady = true;
    this.dispatchWovnApiReadyEvent();
  }

  // Dispatch API loaded event
  this.dispatchWovnApiReadyEvent = function () {
    if (!widget.c('Url').isLiveEditor()) {
      widget.c('Utils').dispatchEvent(wovnApiReadyEvent);
    }
    // only allow this event to be called once
    that.dispatchWovnApiReadyEvent = function () {
    };
  };
};

if (typeof(components) === 'undefined') var components = {};
components['SPA'] = function(widget) {
  var that = this;
  var lastHref = null;
  var timer = undefined;

  widget.c('Utils').onEvent(window, 'popstate', function () {
    var langPath = widget.c('Data').getOptions().lang_path;
    var docLang = widget.c('Lang').getDocLang()
    // do nothing if Data is not loaded
    if (!docLang) return;

    if ((langPath === 'query' || langPath === 'path' || (widget.isBackend() && widget.tag.getAttribute('urlPattern'))) && docLang !== widget.c('Url').getLangCode()) {
      widget.c('Interface').changeLangByCode(widget.c('Url').getLangCode());
    }
  });

  var fixHref = function(href) {
    return widget.c('Url').removeHash(href);
  };

  this.getCurrentFixedHref = function () {
    return fixHref(location.href);
  }

  this.withTurbolinks = function () {
    return lastHref && !timer && window.Turbolinks
  }

  function refreshWidget() {
    if (window.Turbolinks && timer) {
      clearInterval(timer);
      timer = null
      widget.c('Utils').onEvent(document, 'turbolinks:load', refreshWidget)
    }

    var currentHref = that.getCurrentFixedHref();

    // if url hasn't changed OR new url is the result of a lang change(from the old url)
    if (lastHref === currentHref ||
        currentHref === widget.c('Url').getUrl(widget.c('Url').getLangCode(currentHref), lastHref)) {
      return;
    }

    lastHref = currentHref;
    widget.c('Interface').reload();
  }

  this.listen = function() {
    if (!lastHref) {
      lastHref = that.getCurrentFixedHref();
    }

    timer = setInterval(refreshWidget, 100);
  };

  this.stop = function() {
    if (timer) {
      clearInterval(timer);
    } else if (window.Turbolinks) {
      widget.c('Utils').removeHandler(document, 'turbolinks:load', refreshWidget)
    }
  };

  this.destroy = function() {
    that.stop();
  };
};

if (typeof(components) === 'undefined') var components = {}
components['ParcelForwarding'] = function(widget) {
  var that = this
  var Vue = widget.c('Vue')
  this.banner = null
  this.start = function () {
    widget.c('Interface').insertStyles(widget.c('RailsBridge')['tenso']['style'])

    var PARCEL_FORWARDING_LANG_COOKIE = "wovn_parcel_forwarding_lang"
    var provider = widget.c('Data').get()["widgetOptions"]["parcel_forwarding"]
    var providerName = {};
    if (provider === 'raku-ichiban') {
      providerName['ja'] = '楽一番';
      providerName['en'] = 'Leyifan';
      providerName['cht'] = '楽一番';
      providerName['chs'] = '楽一番';
    }
    else {
      providerName['ja'] = '転送コム';
      providerName['en'] = 'Tenso';
      providerName['ko'] = 'http://j.wovn.io/tenso.com';
      providerName['cht'] = 'tenso';
      providerName['chs'] = 'tenso';
    }
    var parcelForwardingLangs = [
      {name: '日本', code: 'jp'},
      {name: 'EN', code: 'en'},
      {name: '繁體', code: 'cht'},
      {name: '简体', code: 'chs'},
    ]
    if (provider !== 'raku-ichiban') {
      parcelForwardingLangs.push({name: '한글', code: 'kr'})
    }
    function getParcelForwardingLang(force) {
      var currLang = widget.c('Cookie').get(PARCEL_FORWARDING_LANG_COOKIE)

      if (currLang === null || force) {
        var docLang = widget.c('Lang').getDocLang()

        if (provider === 'raku-ichiban') {
          currLang = 'chs'
        }
        else { //provider == tenso
          currLang = 'en'
        }

        switch (docLang) {
          case 'ja':
            currLang = 'jp'
            break
          case 'zh-CHS':
            currLang = 'chs'
            break
          case 'zh-CHT':
            currLang = 'cht'
            break
          case 'ko':
            if (provider !== 'raku-ichiban') {
              currLang = 'kr'
            }
            break
          case 'en':
            currLang = 'en'
        }

        widget.c('Cookie').set(PARCEL_FORWARDING_LANG_COOKIE, currLang, 365)
      }

      return currLang
    }

    // do not create tenso modal if already shown to user
    if (widget.c('Cookie').get(PARCEL_FORWARDING_LANG_COOKIE) === null) {
      var tensoModal = document.createElement('div')
      tensoModal.id = 'wovn-tenso-modal';
      if (provider == "raku-ichiban") {
        tensoModal.className = 'raku-ichiban';
      }
      tensoModal.setAttribute('wovn-ignore', '')
      tensoModal.innerHTML = widget.c('RailsBridge')['tenso']['modal'];
      tensoModal.setAttribute('v-bind:class', '{opened: opened}')
      tensoModal.setAttribute('v-on:click', 'close')
      document.body.appendChild(tensoModal)
      var tensoModalVue = new Vue({
        el: '#wovn-tenso-modal',
        data: {
          opened: false,
          currentLangCode: getParcelForwardingLang(),
          languages: parcelForwardingLangs,
          textContents: {
            'jp': {
              'title': '簡単に海外発送することができます！',
              'subtitle1': providerName['ja'] + 'を使えば、簡単に海外配送が可能になります。',
              'subtitle2': '日本の通販サイトの商品を、あなたの国へお届けします。登録は無料！',
              'step1': providerName['ja'] + 'に登録して日本の住所をゲット！登録は無料！',
              'step2': '日本の通販サイトでお好きなアイテムを購入',
              'step3': '日本国外へ商品を転送！',
              'cancel': '閉じる',
              'ok': '登録はこちら'
            },
            'en': {
              'title': 'Easily shop in Japan and ship overseas!',
              'subtitle1': 'With ' + providerName['en'] + ', you can easily order products from Japan and have them shipped to your home address in your country.',
              'subtitle2': 'Registration is free!',
              'step1': 'Get a ' + providerName['en'] + ' Japanese mailing address. Registration is free!',
              'step2': 'Purchase your items from any Japanese e-commerce site.',
              'step3': 'Your items will be forwarded from your Japanese address to your overseas address.',
              'cancel': 'Close',
              'ok': 'Register now'
            },
            'cht': {
              'title': '將您購買的商品快速便捷地送往海外！',
              'subtitle1': '利用' + providerName['cht'] + '，將原本困難的海外配送瞬間化為可能',
              'subtitle2': '免費註冊！讓您在日本網站購買的商品被直接送到您家！',
              'step1': '在' + providerName['cht'] + '註冊後即獲得日本地址！註冊免費！',
              'step2': '在日本的網站選購您喜愛的商品',
              'step3': '商品將會從日本國內被送往您所在的國家！',
              'cancel': '關閉',
              'ok': '點擊這裡註冊'
            },
            'chs': {
              'title': '将您购买的商品快速便捷地送往海外！',
              'subtitle1': '利用' + providerName['chs'] + '，将原本困难的海外配送瞬间化为可能',
              'subtitle2': '免费注册！让您在日本网站购买的商品被直接送到家！',
              'step1': '在' + providerName['chs'] + '注册后即获得日本地址！注册免费！',
              'step2': '在日本的网站选购您喜爱的商品',
              'step3': '商品将会从日本国内被送往您所在的国家！',
              'cancel': '关闭',
              'ok': '点击这里注册'
            },
            'kr': {
              'title': '쉽게 해외 배송 수 있습니다!',
              'subtitle1': '전송 컴을 사용하면 쉽게 해외 배송이 가능합니다.',
              'subtitle2': '일본 인터넷 쇼핑몰의 상품을 당신의 국가에 제공합니다. 가입은 무료!',
              'step1': '전송 컴에 가입하고 일본 주소를 겟트! 가입은 무료!',
              'step2': '일본 인터넷 쇼핑몰에서 원하는 상품을 구입',
              'step3': '일본 국외에 상품을 전송!',
              'cancel': '닫기',
              'ok': '등록은 이쪽'
            }
          }
        },
        computed: {
          langLink: function () {
            if (provider == "raku-ichiban") {
              return 'http://www.leyifan.com/' + (this.currentLangCode === 'chs' ? '' : this.currentLangCode)
            }
            else { // provider == tenso
              return 'http://www.tenso.com/' + this.currentLangCode + '/static/lp_shop_index'
            }
          }
        },
        methods: {
          changeLang: function (langObj) {
            this.currentLangCode = langObj.code
            widget.c('Cookie').set(PARCEL_FORWARDING_LANG_COOKIE, this.currentLangCode, 365)
          },
          open: function () {
            this.opened = true
          },
          close: function () {
            this.opened = false
          }
        },
        watch: {
          currentLangCode: function () {
            tensoBannerVue.currentLangCode = this.currentLangCode
          }
        }
      })
      tensoModalVue.open()
    }

    //==========================================================================
    var tensoBanner = document.createElement('div')
    tensoBanner.id = 'wovn-tenso-banner'
    if (provider == "raku-ichiban") {
      tensoBanner.className = 'raku-ichiban';
    }
    tensoBanner.setAttribute('wovn-ignore', '')
    tensoBanner.innerHTML = widget.c('RailsBridge')['tenso']['banner']
    tensoBanner.setAttribute('v-bind:class', '{opened: opened}')
    document.body.appendChild(tensoBanner)
    var tensoBannerVue = new Vue({
      el: '#wovn-tenso-banner',
      data: {
        opened: false,
        imageSrc:'',
        currentLangCode: tensoModalVue ? tensoModalVue.currentLangCode : getParcelForwardingLang(),
        languages: parcelForwardingLangs,
        textContents: {
          'jp': {
            'bannerText': '海外の顧客、商品を購入するにはこちらをクリック！',
            'link' : 'ここをクリック'
          },
          'en': {
            'bannerText': 'Overseas customers, click here to buy this item!',
            'link' : 'Click Here'
          },
          'cht': {
            'bannerText': '海外客戶，點擊這裡買這個商品！',
            'link' : '點擊這裡'
          },
          'chs': {
            'bannerText': '海外客户，点击这里买这个商品！',
            'link' : '点击这里'
          },
          'kr': {
            'bannerText': '해외 고객이 상품을 구입하려면 여기를 클릭!',
            'link' : '여기를 클릭하세요'
          }
        }
      },
      computed: {
        langLink: function () {
          if (provider == "raku-ichiban") {
            return 'http://www.leyifan.com/' + (this.currentLangCode === 'chs' ? '' : this.currentLangCode)
          }
          else { // provider == "tenso"
            return 'http://www.tenso.com/' + this.currentLangCode + '/static/lp_shop_index'
          }
        }
      },
      methods: {
        changeLang: function () {
          this.currentLangCode = getParcelForwardingLang(true)
          widget.c('Cookie').set(PARCEL_FORWARDING_LANG_COOKIE, this.currentLangCode, 365)
        },
        open: function () {
          document.body.setAttribute('wovn-tenso-banner-on', '')
          this.opened = true
        },
        close: function () {
          this.opened = false
          document.body.removeAttribute('wovn-tenso-banner-on')
        }
      }
    })
    tensoBannerVue.open()
    this.banner = tensoBannerVue
  }
}


// expose components so that can be used by the webpack side
document.WOVNIO.components = components;
!function(t){var e={};function r(a){if(e[a])return e[a].exports;var n=e[a]={i:a,l:!1,exports:{}};return t[a].call(n.exports,n,n.exports,r),n.l=!0,n.exports}r.m=t,r.c=e,r.d=function(t,e,a){r.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:a})},r.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},r.t=function(t,e){if(1&e&&(t=r(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var a=Object.create(null);if(r.r(a),Object.defineProperty(a,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var n in t)r.d(a,n,function(e){return t[e]}.bind(null,n));return a},r.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return r.d(e,"a",e),e},r.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},r.p="",r(r.s=137)}({0:function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var a=function(){function t(){}return t.prototype.c=function(t){return this.instance().c(t)},Object.defineProperty(t.prototype,"tag",{get:function(){return this.instance()?this.instance().tag:{getAttribute:function(){}}},enumerable:!0,configurable:!0}),t.prototype.instance=function(){return window.WOVN&&window.WOVN.io&&window.WOVN.io._private?window.WOVN.io._private.widget:null},t.prototype.isBackend=function(){return this.tag.getAttribute("backend")},t.prototype.getBackendCurrentLang=function(){return this.tag.getAttribute("currentLang")},t.prototype.getBackendDefaultLang=function(){return this.tag.getAttribute("defaultLang")},t.prototype.isComponentLoaded=function(t){return!!this.instance()&&this.instance().isComponentLoaded()},t.prototype.isTest=function(){return this.instance().isTest||!1},t.prototype.loadTranslation=function(t,e,r){this.instance()&&this.instance().loadTranslation(t,e,r)},t.prototype.reloadData=function(t){this.instance()&&this.instance().reloadData(t)},t.prototype.loadPreviewData=function(t,e,r){this.instance().loadPreviewData(t,e,r)},t.prototype.loadDataJson=function(t){this.instance().loadDataJson(t)},t.prototype.reinstallComponent=function(t){this.instance().reinstallComponent(t)},t.prototype.loadDomainOption=function(t,e){this.instance().loadDomainOption(t,e)},t.prototype.loadComponents=function(t,e){this.instance().loadComponents(t,e)},t.prototype.loadSavedData=function(t,e){this.instance().loadSavedData(t,e)},t}();e.default=new a},137:function(t,e,r){t.exports=r(253)},138:function(t,e,r){"use strict";t.exports=function(t,e){if(e=e.split(":")[0],!(t=+t))return!1;switch(e){case"http":case"ws":return 80!==t;case"https":case"wss":return 443!==t;case"ftp":return 21!==t;case"gopher":return 70!==t;case"file":return!1}return 0!==t}},139:function(t,e,r){"use strict";var a=Object.prototype.hasOwnProperty;function n(t){return decodeURIComponent(t.replace(/\+/g," "))}e.stringify=function(t,e){e=e||"";var r,n,i=[];for(n in"string"!=typeof e&&(e="?"),t)a.call(t,n)&&((r=t[n])||null!=r&&!isNaN(r)||(r=""),i.push(encodeURIComponent(n)+"="+encodeURIComponent(r)));return i.length?e+i.join("&"):""},e.parse=function(t){for(var e,r=/([^=?&]+)=?([^&]*)/g,a={};e=r.exec(t);){var i=n(e[1]),o=n(e[2]);i in a||(a[i]=o)}return a}},2:function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default={WIDGET_ID:"wovn-translate-widget",BUILT_IN_WIDGET_ID:"wovn-languages",IS_DEV:!1,STALLION_IFRAME_ID:"wovn-stallion-iframe",STALLION_MESSAGE_TYPES:{sync:"WOVN_STALLION_READY",request:"WOVN_STALLION_REQUEST",response:"WOVN_STALLION_RESPONSE"}}},253:function(t,e,r){"use strict";r.r(e);var a=r(34),n=r.n(a),i=r(0),o=r.n(i),s=r(2),c=r.n(s),u=r(79);function l(t){return(l="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t})(t)}var d=(r(37),function(){var t={},e=!0,r=[],a={"og:description":!0,"twitter:description":!0,"og:title":!0,"twitter:title":!0},i={"og:image":!0,"og:image:url":!0,"og:image:secure_url":!0,"twitter:image":!0};this.clearCache=function(){t={}},this.refreshTranslation=function(){var t=o.a.c("Lang").getDefaultCodeIfExists();t&&U(t,o.a.c("TranslationDataBridge").loadFromStore())};var s=["placeholder"],c={search:["value","placeholder"],button:["value","placeholder","data-confirm","data-disable-with"],submit:["value","placeholder","data-confirm","data-disable-with"],image:["src","alt","placeholder","data-confirm"]};function u(t){var e=t.getAttribute("type"),r=s;return e&&(e=e.toLowerCase())in c&&(r=c[e]),r}this.inputAttrs=u,this.traversal=function(t,e,r){var a=[],n=[],i=[],s={nodeName:"",hasAttribute:R},c=o.a.c("ValuesStackBridge").create("",1),u=[],l=[];return I(c=function t(e,r,a,n,i,s,c,u,l,d,f){if(o.a.c("Interface").isWidgetElement(e))return i;if("function"==typeof e.getAttribute&&null!==e.getAttribute("wovn-instant-translation")){var g=t({nodeName:"",hasAttribute:R},e.childNodes,"",d,o.a.c("ValuesStackBridge").create("",1),s,f,u,l||{},[],[]);I(g)&&d.push(g)}if(o.a.c("DomAuditor").shouldIgnoreNode(e,l))return i;for(var h=!!o.a.c("LiveEditor"),p=!!o.a.c("LiveEditorDecorator"),m=e.nodeName.toLowerCase(),v=J[m]||{},b=r.length,y={},w=0;w<b;++w){var x=r[w];o.a.c("OnDemandTranslator").bindOdtClickEvent(x);var N=x.nodeName.toLowerCase(),A=null;if(y.hasOwnProperty(N)){var D=y[N]+1;A=a+"/"+N+"["+D+"]",y[N]=D}else A=a+"/"+N,y[N]=1;if(!(v[N]||(h||p)&&/wovn-span-wrapper/.test(x.className)))switch(Z[N]){case $:break;case q:c.push(o.a.c("TagElementBridge").create(A,x));break;case j:c.push(o.a.c("TagElementBridge").create(A,x)),i.add(T(x,N,l)),i=t(x,x.childNodes,A,n,i,s,c,u,l,d,f),et[N]||i.add(S("</"+N+">",x,!1,!0,!1));break;case H:if(0==k(x.data).length)break;var V=B(r,w+1,[x]);if(w+=V.skipCount,V.nodes.length>0){u.push(V.nodes),V.node=x,V.label=V.text.length>0?s(V.text):V.text;var C=V.text.length>0?s(V.text):V.text;V.isText=!0,i.add(O(C,x,V.text,V.original,V.nodes,V.lookahead,V.skipCount))}break;default:c.push(o.a.c("TagElementBridge").create(A,x)),I(i)&&n.push(i);var U=i.buildNextStack();i=o.a.c("ValuesStackBridge").create(A,1),I(i=t(x,x.childNodes,A,n,i,s,c,u,l,d,f))&&n.push(i),i=U}}if("iframe"==m)try{var L=e.contentDocument;if(L)return t(x=L.firstChild,x.childNodes,A,n,i,s,c,u,l,d,f)}catch(t){}return i}(s,[t],"",u,c,e,a,i,r||{},l,n))&&u.push(c),{tags:a,texts:i,valuesStacks:u,instantTags:n,instantValuesStacks:l}};var l=this;function d(r,a,n){var i=o.a.c("Url"),s=o.a.c("Data"),c=o.a.c("Config"),l=o.a.c("Utils"),d=o.a.c("Parser"),f=o.a.c("ValueStore"),g=o.a.c("UrlFormatter"),h=o.a.c("TranslationDataBridge"),p=i.isLiveEditor(),m=i.getUrl.bind(i),v=i.langUrl.bind(i),b=i.shouldIgnoreLink.bind(i),y=f.getSrcValuesFromSrcsetAttribute.bind(f),w=c.urlPattern("query"),x=c.backend(),A=l.normalizeText.bind(l),T=g.createFromUrl.bind(g),S=d.getUrlsFromCss.bind(d);if((r||a)&&(e=!(!a||(r?r===a&&r===n:a===n)),C()||U(n,h.loadFromStore()),C())){var O=t.text,D=t.image;return{defaultLangCode:n,fromLangCode:r,toLangCode:a,normalizeText:A,createFromUrl:T,getUrlsFromCss:S,fromTextDict:O[r]||{},fromImageDict:D[r]||{},textDict:O[a]||{},imageDict:D[a]||{},originalImageSets:t.originalImageSets,tags:{a:p?R:M(v,a),area:p?R:M(v,a),form:function(t,e,r,a,n){return function(i,o){var s=o.getAttribute("method");if(!t||s&&"GET"!==s.toUpperCase()){if(e){var c=o.getAttribute("action"),u=c&&0!==c.length?c:location.href;if(!r(u)){var l=a(n,u);o.setAttribute("action",l)}}}else{for(var d=o.element.children,f=d.length-1;f>=0;f--){var g=d[f];if("INPUT"===g.tagName&&"wovn"===g.getAttribute("name")&&"hidden"===g.getAttribute("type"))return void g.setAttribute("value",n)}var h=document.createElement("input");h.setAttribute("type","hidden"),h.setAttribute("name","wovn"),h.setAttribute("value",n),o.element.appendChild(h)}}}(w,x,b,m,a),img:F(y),source:F(y)},attrs:s.useAriaLabel()?["aria-label"]:[],tagAttrs:{option:["label"],a:["title"],optgroup:["label"],img:["alt","srcset","src"],textarea:["alt","placeholder"],source:["srcset"]},tagAttrsCondition:{meta:N,input:u}}}}function f(t,e,r){var a,n;return"src"===e?(a=(n=t.getAttribute("src"))?t.element.src:"","path"!==o.a.tag.getAttribute("urlPattern")||/^(https?:\/\/|\/)/.test(n)||(a=o.a.c("Url").getUrl(r,a,!0))):a=t.getAttribute(e),a}function g(t,e){var r=l.extractTextNodes(t),a=l.extractTextNodes(e);if(r.length===a.length)for(var n=t.fragments[0].node.parentNode,i=0;i<r.length;++i){var o=r[i],s=a[i];if(o.isText){o.lookahead.forEach(function(t){t.nodeValue=""});var c=s.isText?s.label:"​";o.node.nodeValue=s?h(o.original,c):"​"}else if(s.isText){var u=document.createTextNode(s.label);o.isOpen||o.isSentinel?(o.node?o.node.parentElement:n).insertBefore(u,o.node):o.isClose&&o.node.appendChild(u),w(u,"")}}}function h(t,e){return!e&&t.match(/^\s*$/)?t:e&&e.match(/^\s*$/)?"​"+e+"​":E(e)||"​"}this.swapUnifiedValue=function(e,a,n){!function(t){var e=o.a.c("Utils"),r=e.createInitEvent("beforeSwapUnifiedValue",!0,!0);r.rootNode=t,e.dispatchEvent(r)}(e);var s=o.a.c("Lang").getDefaultCodeIfExists();if(s){var c=d(a,n,s);if(c){a===n&&(a=s);var u=o.a.c("Data").getIgnoredPatterns(),p=this.traversal(e,c.normalizeText,u);void 0!==a&&a!=c.defaultLangCode||(p.tags.concat(p.instantTags).forEach(function(t,e){for(var r=A(t,e),a=0;a<r.length;++a){var n=m(t,e,r[a]);!n.hasOriginal&&n.current&&e.setAttribute(n.attr,n.current)}var i=window.getComputedStyle(e.element).getPropertyValue("background-image");if(i&&"none"!==i){var o=_("background-image");e.hasAttribute(o)||v(i,t)&&e.setAttribute(o,i)}}.bind(null,c)),p.valuesStacks.forEach(function(t){var e=t.path,r=t.src;c.textDict.hasOwnProperty(r)?b(c,t):(o.a.c("DomAuditor").markHasNewMissedSrcIfFirstSeen(r),o.a.c("ValueStore").noteMissedValueIfNeeded(r,n)),V(r,e,t.isComplex(),!1,!0)}),p.tags.forEach(function(t){A(c,t).forEach(function(e){var r=f(t,e,c.defaultLangCode);if(r){var a,n=t.nodeName.toLowerCase(),s="img"==n&&"src"==e||"input"==n&&"src"==e,u=i[t.getAttribute("property")],l=!1;if(s||u){a=t.xpath,u&&(a+="[@image]");var d=c.createFromUrl(r);d.setShowFullUrl();var g=d.getOriginalUrl();l=c.imageDict.hasOwnProperty(g),r=g}else a=t.xpath+"[@"+e+"]",l=c.textDict.hasOwnProperty(g);l||o.a.c("DomAuditor").markHasNewMissedSrcIfFirstSeen(r),V(r,a,!1,!1,!1)}})})),p.tags.concat(p.instantTags).forEach(function(t,e){var r=t.tags[e.nodeName.toLowerCase()];r&&r(t,e);for(var a=A(t,e),n=0;n<a.length;++n){var i=a[n],o=m(t,e,i);o.hasOriginal&&!o.changed&&e.setAttribute(i,o.original)}var s=_("background-image"),c=e.getAttribute(s);c&&v(c,t)&&(e.element.style.backgroundImage=c)}.bind(null,c)),p.texts.forEach(function(t,e){var r=e[0];if("TITLE"!=r.nodeName){var a=x(r);if(a&&"#comment"===a.nodeName){var n=a.data;if(0===n.indexOf(W)){r.data=h(r.data,function(t){if(t){var e=t.indexOf(G);return-1==e?t.substring(W.length):t.substring(W.length,e)}return null}(n));for(var i=1;i<e.length;++i)e[i].data=""}}}else r.data=t.cache.title}.bind(null,c));var w=d(c.defaultLangCode,n,s);if(w){var N=this.traversal(e,w.normalizeText,u);if(N.tags.concat(N.instantTags).forEach(function(t){var e=n!==a;o.a.c("ValueStore").applyPropertySetting(t.element,n,e)}),n!==c.defaultLangCode){if(o.a.c("Data").useFuzzyMatch()){var T=o.a.c("FuzzyMatch").fuzzyMatch(z(c),n);o.a.c("Utils").assign(w.textDict,function(t,e){var r={};return t.forEach(function(t){if(e[t.existSrc]){var a=E(e[t.existSrc].src);document.createElement("html"),r[t.similarSrc]=widget.c("UnifiedValue").getValueByHtml(a)}}),r}(T,z(c)))}N.tags.forEach(function(t,e){var r=e.nodeName.toLowerCase(),a=t.tags[r];a&&a(t,e);for(var n=A(t,e),i=0;i<n.length;++i){var o=n[i],s=f(e,o,t.defaultLangCode);if(s){var c=t.normalizeText(s);if("img"==r&&"src"==o||"input"==r&&"src"==o){var u=t.createFromUrl(c);u.setShowFullUrl();var l=u.getOriginalUrl(),d=t.imageDict[l];if(!d||!d.dst)continue;e.setAttribute(o,d.dst)}else{var g=t.textDict[c];if(!g)continue;var h=P(g);e.setAttribute(o,h)}}}var p=function(t,e){var r=window.getComputedStyle(e.element).getPropertyValue("background-image");return r?t.getUrlsFromCss(r):[]}(t,e);if(p.length>0){var m=p.map(function(e){var r=t.imageDict[e];return r&&r.dst||e});m.toString()!==p.toString()&&(e.element.style.backgroundImage=m.map(function(t){return"url("+t+")"}).join(", "))}}.bind(null,w)),N.instantTags.forEach(function(t,e,r){var a=r.nodeName.toLowerCase(),n=t.tags[a];n&&n(t,r);for(var i=A(t,r),s=0;s<i.length;++s){var c=i[s],u=f(r,c,t.defaultLangCode);if(u&&!("img"==a&&"src"==c||"input"==a&&"src"==c)){var d=t.normalizeText(u),g=t.textDict[d];if(g){var h=P(g);r.setAttribute(c,h)}else o.a.c("InstantTranslation").translate(e,d,function(e){g=l.getValueByHtml(e.dst),t.textDict[d]=g,r.setAttribute(c,P(g))})}}}.bind(null,w,n)),N.valuesStacks.forEach(function(t,e){var a=e.src,n=t.textDict[a];n?(g(e,n),r.push(e.src)):function(t,e){t.fragments.forEach(function(t){if(t.isText){var r=t.escapedSrc,a=e.textDict[r];if(a&&0!==a.fragments.length){var n=a.fragments[0].label;n&&(y(e,t.nodes),t.node.nodeValue=h(t.original,n))}}}),r.push(t.src)}(e,t)}.bind(null,w)),N.instantValuesStacks.forEach(function(t,e,r){var a=t.textDict[r.src];if(a)return b(t,r),void g(r,a);o.a.c("InstantTranslation").translate(e,r.src,function(e){a=l.getValueByHtml(e.dst),t.textDict[r.src]=a,b(t,r),g(r,a)})}.bind(null,w,n))}o.a.c("Constant").IS_DEV&&(window.debug_uv={param:c,all:p,cache:t})}}}},this.findDstFragments=function(t,e,r){var a=d(e,r,o.a.c("Lang").getDefaultCodeIfExists()),n=t,i=null;return a.textDict&&a.textDict[t.src]&&(i=(n=a.textDict[t.src]).created_at,n.fragments.length!==t.fragments.length&&(n=this.addEmptyTextNodes(n))),{createdAt:i,fragments:n.fragments}},this.migrateReportedValueWithFragmentValue=function(t,e){var r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:document.head.parentNode,a=o.a.c("Lang").getDefaultCodeIfExists();if(a&&!o.a.c("Data").useUnifiedValue()){var n=d(t,e,a);if(n){var i=o.a.c("DomAuditor").needsUVMigrationReportForUnreportableDomain();if(t==n.defaultLangCode){var s=o.a.c("Data").getIgnoredPatterns(),c=this.traversal(r,n.normalizeText,s),u=o.a.c("Data").getTextValues(),f=o.a.c("Data").getPublishedLangs();c.valuesStacks.forEach(function(t){var e=t.path,r=t.src;if(1!==t.fragments.length||t.src!==t.lastFragment.text){var a=l.createDsts(t,f,u);i&&0===Object.keys(a).length||(o.a.c("DomAuditor").markHasNewMissedSrcIfFirstSeen(r),V(r,e,t.isComplex(),!1,!0,a,!0))}})}}}},this.createDsts=function(t,e,r){var a={};return e.forEach(function(e){var n="",i=!1;t.fragments.forEach(function(t){if(t.isText){var a=r[t.label],o="";a&&a[e]?(i=!0,o=a[e][0].data):o=t.src,n+=t.original.replace(/^(\s*)[\s\S]*?(\s*)$/,function(t,e,r){return e+(o.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")||"​")+r})}else n+=t.label}),i&&(a[e]=n)}),a};var p={isSentinel:!0};function m(t,e,r){var a=_(r),n=e.getAttribute(a),i=e.getAttribute(r),s=e.hasAttribute(a),c=t.fromTextDict[n],u=!1;if(!c&&n&&"IMG"==e.element.nodeName){if("src"==r){var l=function(t,e){var r=t.createFromUrl(e);return r.setShowFullUrl(),r.getOriginalUrl()}(t,n),d=t.fromImageDict[l];c=d?d.dst:null}else if("srcset"==r){var f=o.a.c("ValueStore").getSrcValuesFromSrcsetAttribute(n);for(var g in c=n,f)if(f.hasOwnProperty(g)){var h=t.fromImageDict[g];if(h&&h.dst){var p=f[g];c=c.replace(p,h.dst)}}}u=s&&c!==i}else u=s&&c&&c.fragments[0]&&c.fragments[0].label!==i;return{attr:a,hasOriginal:s,changed:u,current:i,original:n}}function v(t,e){var r=e.getUrlsFromCss(t);if(!r||0===r.length)return!1;for(var a=0;a<r.length;a++)if(e.originalImageSets[r[a]])return!0;return!1}function b(t,e){e.fragments.forEach(function(e){e.isText&&y(t,e.nodes)})}function y(t,e){var r=e[0];"TITLE"!=r.nodeName?w(r,e.reduce(function(t,e){return t+e.data},"")):t.cache.title=t.cache.title||r.data}function w(t,r){if(e){var a,n=x(t);if(!n||"#comment"!==n.nodeName||0!==(a=n.data).indexOf(W)){var i=t.parentElement||t.parentNode;i&&(a=document.createComment(W+r),"TITLE"===i.nodeName?i.parentNode.insertBefore(a,i):i.insertBefore(a,t))}}}function x(t,e){var r=t.parentElement||t.parentNode;if(r&&"TITLE"===r.nodeName)return r.previousSibling;var a=t.previousSibling;return a?"#text"==a.nodeName?x(a,t):a:e}function N(t){var e=t.getAttribute("name"),r=t.getAttribute("property");return"description"==e||a[r]||i[r]?["content"]:[]}function A(t,e){var r=e.nodeName.toLowerCase(),a=[];function n(t){a.push(t)}return t.attrs.forEach(n),(t.tagAttrs[r]||[]).forEach(n),((t.tagAttrsCondition[r]||R)(e)||[]).forEach(n),a}function T(t,e,r){var a=o.a.c("DomAuditor").shouldIgnoreNode(t,r);return S(a?o.a.c("DomAuditor").isWovnInstantTranslation(t)?"<"+e+" wovn-instant-translation>":"<"+e+" wovn-ignore>":"<"+e+">",t,!0,!1,a)}function S(t,e,r,a,n){return o.a.c("UnifiedValueTagFragmentBridge").create(t,e,r,a,n)}function O(t,e,r,a,n,i,s){return o.a.c("UnifiedValueTextFragmentBridge").create(t,e,r,a,n,i,s,!1)}function D(t){return o.a.c("UnifiedValueTextFragmentBridge").create(t,null,t,t,null,null,0,!0)}function I(t){return t.hasText()}function V(t,e,r,a,n,i,s){o.a.c("Utils").isEmpty(o.a.c("Utils").normalizeText(t))||o.a.c("DomAuditor").addSrc(t,e,r,a,n,i,s)}function C(){return!(!t.text||!t.image)}function U(e,r){var a=L(0,r.textVals,function(t,e,r,a){var n=o.a.c("ValuesStackBridge").create("",1);n.add(O(r)),n.created_at=a,t[e]=n}),n=L(0,r.htmlTextVals,function(t,e,r,a){var n=l.getValueByHtml(r);n.created_at=a,t[e]=n});t.text=function(){for(var t={},e=0;e<arguments.length;++e){var r=arguments[e];for(var a in r)if(r.hasOwnProperty(a))for(var n in t[a]||(t[a]={}),r[a])r[a].hasOwnProperty(n)&&(t[a][n]=r[a][n])}return t}(a,n);var i=r.calcImgValsForIndex();for(var s in t.image=L(0,i,function(t,e,r,a){t[e]={dst:r,created_at:a}}),t.originalImageSets={},i)i.hasOwnProperty(s)&&(t.originalImageSets[s]=!0)}function L(t,e,r){var a={};for(var n in e){var i=e[n];for(var o in i){r(a[o]=a[o]||{},n,i[o][0].data||"",i[o][0].created_at)}}return a}function E(t){return t.replace("&lt;","<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&")}function P(t){return t.fragments.filter(function(t){return t.isText}).map(function(t){return t.label}).join("")}function k(t){return o.a.c("Utils").normalizeTextWithoutZeroWidthSpace(t)}function _(t){return"data-"+W+"-original-"+t}function M(t,e){return function(r,a){var i,s=a.element;if(!o.a.c("DomAuditor").shouldIgnoreNode(a.element,o.a.c("Data").getIgnoredPatterns())){var c=t(e,a.element),u="wovnLinkSrcHref"in s.dataset;if(u)i=s.dataset.wovnLinkSrcHref;else try{i=(i=new n.a(s.getAttribute("href"),location.origin).href).replace(new RegExp("/"+e+"(/|$)"),"$1")}catch(t){i=null}var l=i+"-lang="+e,d=o.a.c("Data").getLinkTranslations()[l];d?("disabled"===d?(s.href="javascript:void(0)",s.setAttribute("disabled","disabled")):(s.setAttribute("href",d),s.removeAttribute("disabled")),s.dataset.wovnLinkSrcHref=i):u?(s.setAttribute("href",i),s.removeAttribute("data-wovn-link-src-href"),s.removeAttribute("disabled")):c&&a.setAttribute("href",c)}}}function F(t){return function(e,r){var a=r.getAttribute("srcset");if(a){var n=t(a),i=a;for(var o in n){var s=e.imageDict[o];if(s&&s.dst){var c=n[o];i=i.replace(c,s.dst)}}a!==i&&r.setAttribute("srcset",i)}}}function R(){}function B(t,e,r){for(var a=[],n=0,i=e;i<t.length;++i){var o=t[i],s=o.nodeName.toLowerCase();if("#text"==s)a.push(o),++n;else{if("#comment"!=s)break;if(0===o.data.indexOf(W)){++n;break}++n}}var c=r.concat(a),u=c.reduce(function(t,e){return t+e.data},"");return{text:u.trim(),original:u,nodes:c,lookahead:a,skipCount:n}}function z(t){var e={};return Object.keys(t.textDict).map(function(a){a&&r&&!o.a.c("Utils").includes(r,a)&&(e[a]=t.textDict[a])}),e}this.extractTextNodes=function(t){if(0==t.fragments.length)return[];for(var e=[],r=0;r<t.fragments.length;++r){var a=t.fragments[r];e.push(a),a.isText&&++r}return t.lastFragment.isText||e.push(p),e},this.addEmptyTextNodes=function(t,e){var r=t.fragments;if(r.length>0)for(var a=r.length-1;a>=-1;--a){var n=-1===a?null:r[a],i=!n||!n.isText,o=a===r.length-1?null:r[a+1],s=!o||!o.isText;if(i&&s){var c=e?document.createTextNode(""):null;e&&(o?o.node.parentElement.insertBefore(c,o.node):n.node.parentElement.appendChild(c)),t.fragments.splice(a+1,0,O("",c,"","",[c],[],0))}}return t},this.getValueByHtml=function(t){var e=o.a.c("ValuesStackBridge").create("",1),r=t.split(/(<.+?>)/);if(1==r.length&&""==r[0])return e.add(D(r[0])),e;for(var a=0;a<r.length;++a){var n=r[a];if(""!=n)if("<"==n[0]){var i=n.toLowerCase();"/"==n[1]?e.add(S(i,null,!1,!0,!1)):e.add(S(i,null,!0,!1,-1!==i.indexOf("wovn-ignore")))}else e.add(D(n))}return e};for(var W="wovn-src:",$=1,j=2,H=3,q=4,G=",wovn-actual-lang:",J={symbol:{title:!0,desc:!0}},Z={"#comment":$,"#text":H},X=o.a.c("RailsBridge").unifiedValues.skipElements,Y=0;Y<X.length;Y++)Z[X[Y]]=$;for(var K=o.a.c("RailsBridge").unifiedValues.skipElementsWithoutAttributes,Q=0;Q<K.length;Q++)Z[K[Q]]=q;for(var tt=o.a.c("RailsBridge").unifiedValues.emptyElements,et={},rt=0;rt<tt.length;rt++)et[tt[rt]]=1,Z[tt[rt]]=j;for(var at=o.a.c("RailsBridge").unifiedValues.inlineElements,nt=0;nt<at.length;nt++)Z[at[nt]]=j});document.WOVNIO=document.WOVNIO||{},document.WOVNIO.components=document.WOVNIO.components||[],document.WOVNIO.components.DomAuditor=function(){var t,e,r,a,i=["div","p","pre","blockquote","figcaption","address","h1","h2","h3","h4","h5","h6","li","dt","dd","th","td"],s=["span","a","em","strong","small","tt","s","cite","q","dfn","abbr","time","code","var","samp","sub","sup","i","b","kdd","mark","u","rb","rt","rtc","rp","bdi","bdo","wbr","nobr"],l=["br","img","ruby","ul","ol"],d=this;a=o.a.isTest()?100:c.a.IS_DEV?1e3:o.a.c("Url").hasFlag("instantReport")?1e3:5e3;var f,g,h,p=0,m=!1,v=!1,b=!1,y=void 0,w=void 0,x={"og:description":!0,"twitter:description":!0,"og:title":!0,"twitter:title":!0},N={"og:image":!0,"og:image:url":!0,"og:image:secure_url":!0,"twitter:image":!0};function A(){t={},e={},r=!1,clearTimeout(f),f=void 0,g=0,h=0,p=0}function T(t){try{encodeURIComponent(o.a.c("Utils").toJSON(t))}catch(t){return!1}var e=o.a.c("Utils").trimString(t);return""!==e&&!/^(%([a-f]|[0-9]){2})+$/i.test(e)&&function(t){var e=o.a.c("Lang");return"ko"===e.getDefaultCodeIfExists()||!e.isKoreanText(t)}(e)}function S(t,e,r,a,n,i){return{src:t,xpath:e,complex:r,unified:Boolean(n),is_third_party:a,exists:!0,dsts:i}}function O(t){return/meta/.test(t.xpath)||t.is_third_party}function D(r,a,n,i,s,c,u){var l=o.a.c("Lang").getDefaultCodeIfExists();if(l&&o.a.c("Lang").getActualLang()===l){var f=S(r,a,n,i,s,c);if(d.needsUVMigrationReportForUnreportableDomain()&&!u)return;(function(e){if(!e.complex&&o.a.c("Data").useFragmentedValue()&&e.xpath.match(/text\(\)$/))for(var r in t)if(t.hasOwnProperty(r)){var a=t[r];if(a.complex&&o.a.c("StringUtils").startsWith(e.xpath,a.xpath))return!0}return!1})(f)||(t.hasOwnProperty(r)||e.hasOwnProperty(r)&&!O(e[r])||(e[r]=f),t.hasOwnProperty(r)&&!O(t[r])||(t[r]=f))}}this.isSwappedMoreThanOnce=!1,o.a.c("Url").isIframeLiveEditor()||(o.a.c("AuditTrigger").auditor=U),this.getInternalCurrentLang=function(){return y},this.getnewSrcs=function(){return e},this.getForceReporting=function(){return b},this.setReportTime=function(t){a=t},this.markHasNewMissedSrcIfFirstSeen=function(e){t.hasOwnProperty(e)||(r=!0)},A(),this.isAddableSrc=T,this.addSrc=D,this.supervisedSwapVals=function(t,e,r){if(o.a.c("PageChecker").isSupervisedPage())for(var a=document.querySelectorAll("[wovn-enable]"),n=0;n<a.length;n++){var i=a[n].firstChild||a[n];o.a.c("Data").useUnifiedValue()&&(i=a[n]),o.a.c("DomAuditor").swapVals(t,{head:i},r||!0)}else o.a.c("DomAuditor").swapVals(t,null,r||!0)},this.swapVals=function(e,a,c){if(o.a.c("Data").useUnifiedValuesMigrating()&&o.a.c("UnifiedValue").migrateReportedValueWithFragmentValue(y,e),a||(a={}),o.a.c("Data").useUnifiedValue())return o.a.c("PerformanceMonitor").mark("swap_start"),o.a.c("UnifiedValue").swapUnifiedValue(a.head||document.head.parentNode,y,e),o.a.c("PerformanceMonitor").mark("swap_end"),y=e,this.isSwappedMoreThanOnce=!0,void(o.a.c("Data").dynamicLoading()&&o.a.c("ValueStore").loadNewDetectedValue());var u=["#text","img","meta","a","area","form","input","textarea","option","source"],d=null;o.a.c("Data").useAriaLabel()&&((d=d||{})["aria-label"]=function(t,r){var a=o.a.c("NodeContainer").create(t);a.data=t.getAttribute("aria-label");var n=o.a.c("ValueStore").getByValue(a,r,e);n&&o.a.c("ValueStore").replaceAttribute(a,"aria-label",n.data,e)});for(var f=o.a.c("ValueStore").propertyIndexTags(),g=0;g<f.length;g++)u.push(f[g]);o.a.c("Data").useFragmentedValue()&&(u=(u=u.concat(i)).concat(s)),o.a.c("PerformanceMonitor").mark("swap_start"),!1!==c&&(c=!0);var h=c?function(t,r,a){if(o.a.c("Utils").canStyleChange(t)){var n=function(t){var r=[];e!==y&&o.a.c("ValueStore").revertImage(t);var a=A(t);e!==y&&""===t.style.backgroundImage&&(r=a);var n=a.map(function(t){return o.a.c("ValueStore").getDstImage(t,e)||t});return n.length>0&&n.toString()!==a.toString()&&(o.a.c("ValueStore").revertImage(t),r=A(t),o.a.c("ValueStore").replaceCssImageData(t,n)),r}(t);n.length>0&&n.forEach(function(t){D(t,r+"[@background-image]",!1,a)})}}:function(){},p=o.a.c("Data").getIgnoredPatterns();function m(t,e){return"#text"===t.nodeName.toLowerCase()&&""!==t.nodeValue.replace(/^[`~!@#\$%\^&\*\(\)\-_=\+\[\{\]\}\|;:'",\/\\?]+$/,"")}function v(t){if(b(t)||w(t)){if(t.childNodes.length>0)for(var e=0;e<t.childNodes.length;++e)if(!x(t.childNodes[e]))return!1;return!0}return!1}function b(t){return o.a.c("Utils").indexOf(i,t.nodeName.toLowerCase())>-1}function w(t){return o.a.c("Utils").indexOf(s,t.nodeName.toLowerCase())>-1}function x(t){if(!b(t)&&(-1!=o.a.c("Utils").indexOf(l,t.nodeName.toLowerCase())||w(t))){if(t.childNodes.length>0)for(var e=0;e<t.childNodes.length;++e)if(!x(t.childNodes[e]))return!1;return!0}return"#text"===t.nodeName.toLowerCase()}function A(t){var e=window.getComputedStyle(t).getPropertyValue("background-image");return o.a.c("Parser").getUrlsFromCss(e)}o.a.c("DomIterator").go({target:u,attributes:d,filter:this.createFilterCallback(p),head:a.head},function a(i,s,c,u){if(u&&u.head&&o.a.c("PageChecker").isSupervisedPage()){var l=i.nodeType===Node.ELEMENT_NODE?i:i.parentElement||i.ownerElement;if(!l||l!==u.head&&l.parentElement===u.head.parentElement)return}s&&s.match(/\[@srcset]$/)&&function(r,a,n){var i=o.a.c("ValueStore").replaceSrcsetNode(r,a,e),s=r.value;for(var c in i)if(i.hasOwnProperty(c)){var u=i[c],l=S(c,a,!0);!t.hasOwnProperty(l)&&s.indexOf(u),D(c,a,!1,n)}}(i,s,c);var d,f=!1,g=i.tagName;if("FORM"===g){if(!o.a.c("Config").urlPattern("query")||i.getAttribute("method")&&"GET"!==i.getAttribute("method").toUpperCase()){if(o.a.c("Config").backend()){var h=i.getAttribute("action")&&0!==i.getAttribute("action").length?i.getAttribute("action"):location.href;if(!o.a.c("Url").shouldIgnoreLink(h)){var p=o.a.c("Url").getUrl(e,h);i.setAttribute("action",p)}}}else{for(var b=i.children,w=b.length-1;w>=0;w--)if("INPUT"===b[w].tagName&&"wovn"===b[w].getAttribute("name")&&"hidden"===b[w].getAttribute("type"))return b[w].setAttribute("value",e),!1;var x=document.createElement("input");x.setAttribute("type","hidden"),x.setAttribute("name","wovn"),x.setAttribute("value",e),i.appendChild(x)}return!1}if("META"===g)return N[i.getAttribute("property")]?s+="[@image]":s+=i.getAttribute("name")?"[@name='"+i.getAttribute("name")+"']":"[@property='"+i.getAttribute("property")+"']",(d=i.getAttributeNode("content"))&&""!==d.value&&a(d,s,c,u),!1;if("OPTION"===g)return i.hasAttribute("label")&&(s+="[@label]",(d=i.getAttributeNode("label"))&&""!==d.value&&a(d,s,c,u)),!1;if("IMG"===g&&i.hasAttribute("alt")&&""!==i.getAttribute("alt")&&a(i.getAttributeNode("alt"),s+"[@alt]",c,u),"A"===g&&i.hasAttribute("title")&&""!==i.getAttribute("title")&&a(i.getAttributeNode("title"),s+"[@title]",c,u),("IMG"===g||"INPUT"===g&&"image"===i.getAttribute("type"))&&c)return!0;"INPUT"===g&&(i.hasAttribute("value")&&""!==i.getAttribute("value")&&i.hasAttribute("type")&&"text"!==i.getAttribute("type")&&"search"!==i.getAttribute("type")&&"password"!==i.getAttribute("type")&&"number"!==i.getAttribute("type")&&a(i.getAttributeNode("value"),s+"[@value]",c,u),i.hasAttribute("alt")&&""!==i.getAttribute("alt")&&a(i.getAttributeNode("alt"),s+"[@alt]",c,u),i.hasAttribute("data-confirm")&&""!==i.getAttribute("data-confirm")&&a(i.getAttributeNode("data-confirm"),s+"[@data-confirm]",c,u),i.hasAttribute("data-disable-with")&&""!==i.getAttribute("data-disable-with")&&a(i.getAttributeNode("data-disable-with"),s+"[@data-disable-with]",c,u)),"INPUT"!==g&&"TEXTAREA"!==g||i.hasAttribute("placeholder")&&""!==i.getAttribute("placeholder")&&a(i.getAttributeNode("placeholder"),s+"[@placeholder]",c,u),"IMG"!==g&&"SOURCE"!==g||i.hasAttribute("srcset")&&""!==i.getAttribute("srcset")&&(s=/picture/.test(s)?s.replace("picture/source","picture/img"):s,a(i.getAttributeNode("srcset"),s+"[@srcset]",c,u));var A,O=o.a.c("NodeContainer").create(i);if(("A"===g||"AREA"===g)&&function(t){var r,a="wovnLinkSrcHref"in t.dataset;if(a)r=t.dataset.wovnLinkSrcHref;else try{r=(r=new n.a(t.getAttribute("href"),location.origin).href).replace(new RegExp("/"+e+"(/|$)"),"$1")}catch(t){r=null}var i=r+"-lang="+e,s=o.a.c("Data").getLinkTranslations()[i];if(s)"disabled"===s?(t.href="javascript:void(0)",t.setAttribute("disabled","disabled")):(t.setAttribute("href",s),t.removeAttribute("disabled")),t.dataset.wovnLinkSrcHref=r;else if(a)t.setAttribute("href",r),t.removeAttribute("data-wovn-link-src-href"),t.removeAttribute("disabled");else{var c=o.a.c("Url").langUrl(e,t);c&&!o.a.c("Url").isLiveEditor()&&t.setAttribute("href",c)}}(i),o.a.c("Data").useFragmentedValue()&&function(t,e){return!!m(t)||!function(t,e){var r=function(t){var e=[];if(t.childNodes){for(var r=[],a=0;a<t.childNodes.length;a++)r.push(t.childNodes[a]);e=r.filter(function(t){var e=!0;return"#text"===t.nodeName.toLowerCase()&&o.a.c("Utils").normalizeText(t.nodeValue)&&(e=t),e})}return e}(t);return 0===r.length||!(1!==r.length||!m(r[0]))||!(1!==r.length||!v(r[0]))}(t)&&!function(t,e){return""===o.a.c("Utils").normalizeText(t.innerText||"",!0)}(t)&&!!v(t)}(i)&&!m(i)){var I=o.a.c("ValueStore").getDefaultComplexValue(i,s);if(I&&I.data){var V=o.a.c("ValueStore").getOriginalComplexData(i);(A=o.a.c("ValueStore").getByComplexValue(i,s,e))&&(f=!0,o.a.c("ValueStore").replaceComplexData(O,A.data)),D(V,s,!0,c)}}else if(function(t,e){return"#text"===t.nodeName&&""!==o.a.c("Utils").trimString(t.node.textContent)||!!t.isValueNode()||"IMG"===e||"META"===e||"FORM"===e||"OPTION"===e||"SOURCE"===e||!("INPUT"!==e||!t.node.src)}(O,g)){if(function(t){return/\/svg\/.*text\(\)/.test(t)&&!/\/text\/text\(\)$/.test(t)}(s))return!1;"INPUT"===g&&O.node.src&&(s+="[@image]");var C=o.a.c("ValueStore").getDefaultValue(O,s);if(!C)return!1;var U=C.data;if(!U)return!1;if(!T(U))return!1;(A=o.a.c("ValueStore").getByValue(O,s,e))||(A=C,"IMG"!==g&&o.a.c("ValueStore").noteMissedValueIfNeeded(U,e),t.hasOwnProperty(U)||(r=!0)),o.a.c("Node").disableIllegitimateNode(O),o.a.c("ValueStore").replaceData(O,A.data,e),o.a.c("Node").isLegitimateNode(O)&&D(C.data,s,!1,c)}if("INPUT"===g||"TEXTAREA"===g)return!1;var L=e!==y;return o.a.c("ValueStore").applyPropertySetting(i,e,L),f},h,function(){}),y=e,this.isSwappedMoreThanOnce=!0,o.a.c("PerformanceMonitor").mark("swap_end"),o.a.c("Data").dynamicLoading()&&o.a.c("ValueStore").loadNewDetectedValue()},this.createFilterCallback=function(t){var e=this.shouldIgnoreNode;return function(r,a){if(e(r,t||{}))return!0;var n=r.nodeName;return!!("SCRIPT"===n||"NOSCRIPT"===n||"STYLE"===n||function(t,e){return"IMG"===e&&/googlesyndication\.com/i.test(t.src)}(r,n)||function(t,e){return"META"===n&&!(/^(description)$/.test(t.getAttribute("name"))||x[t.getAttribute("property")]||N[t.getAttribute("property")])}(r)||function(t,e){return"OPTION"===n&&!t.hasAttribute("label")&&t.textContent.length<=0}(r)||function(t,e){if("INPUT"!==n)return!1;var r=t.getAttribute("type");return!(/^(button|submit)$/i.test(r)&&t.getAttribute("value")||/^(button|submit)$/i.test(r)&&t.getAttribute("data-confirm")||/^(button|submit|image)$/i.test(r)&&t.getAttribute("data-disable-with")||/^(email|text|search|password|number)$/i.test(r)&&t.getAttribute("placeholder")||/^image$/i.test(r)&&t.src)}(r)||function(t,e){return I=I||document.body,"goog-gt-tt"===t.id||function(t,e){for(var r=I.nextSibling;r;){if(r===t)return!0;r=r.nextSibling}return!1}(t)}(r)||"SOURCE"===n&&!/picture/.test(a))}},this.isWovnInstantTranslation=function(t){return null!==t.getAttribute("wovn-instant-translation")},this.shouldIgnoreNode=function(t,e){return!("function"!=typeof t.getAttribute||null===t.getAttribute("wovn-ignore")&&!o.a.c("DomAuditor").isWovnInstantTranslation(t)&&!o.a.c("OnDemandTranslator").isOdtIgnoreNode(t))||!(!e.classes||!function(t,e){if(t.className&&"function"==typeof t.className.split)for(var r=0;r<e.length;r++)if(t.className.split(" ").indexOf(e[r])>-1)return!0;return!1}(t,e.classes))||!!function(t,e){if(!e||!e.length)return!1;for(var r=0;r<e.length;r++){var a=e[r];try{if(document.querySelector(a)==t)return!0}catch(t){}}return!1}(t,e.selectors)};var I=document.body;function V(){for(var a in e)e.hasOwnProperty(a)&&(t.hasOwnProperty(a)&&!/meta/.test(t[a].xpath)||(t[a]=e[a]));e={},r=!1}function C(){(function(){var t=o.a.c("Lang").getDefaultCodeIfExists();if(!t)return!1;var e=o.a.c("Lang").getDocLang();return!(!e||o.a.tag.getAttribute("debugMode")||o.a.c("Config").backend()&&e!==t)})()&&(++g,clearTimeout(f),V(),f=setTimeout(function(){g=0,function(){if(!(location.hash.match(/wovn.haltReporting/)||o.a.c("Url").isLiveEditor()||m)){++h,V();var e=[];for(var r in t)t.hasOwnProperty(r)&&e.push(t[r]);e=Object(u.filterValuesByTranslationData)(e,o.a.c("Data").getTranslationData(),o.a.c("Data").getPublishedLangs()),function(e,r,a,n){if(0!==t.length){if(!o.a.c("Utils").isValidURI(location.href))return null;var i=new XMLHttpRequest,s=o.a.c("Url").getApiHost();i.open("POST",s+e,!0),i.onreadystatechange=function(){4==i.readyState&&200==i.status&&4===i.readyState&&200===i.status&&p++},i.setRequestHeader("Content-Type","application/x-www-form-urlencoded");var c="",u=o.a.c("Utils").toJSON(r,null,4);if(c+="url="+o.a.c("Url").getEncodedLocation()+"&no_record_vals="+encodeURIComponent(u),o.a.c("Data").useFuzzyMatch()){var l=o.a.c("Utils").toJSON(o.a.c("FuzzyMatch").getServerFormattedFuzzyMatches());c+="&fuzzy_match="+encodeURIComponent(l)}o.a.c("PageChecker").isSupervisedPage()&&(c+="&supervised_detected"),1===h&&o.a.c("ValueStore").corruptedVals&&o.a.c("ValueStore").corruptedVals.length>0&&(c+="&corruptedVals="+encodeURIComponent(JSON.stringify(o.a.c("ValueStore").corruptedVals,null,4))),!0===v&&(c+="&high_priority"),i.send(c)}}("report_values/"+o.a.tag.getAttribute("key"),e)}}()},a))}function U(t,a){var n=o.a.c("Lang").getDefaultCodeIfExists();if(n){location.hash.match(/wovn.debugAudit/)&&console.log("AUDIT");var i=o.a.c("Lang").getDocLang()||n;o.a.c("Lang").shouldSwapVals(n,i)&&o.a.c("DomAuditor").supervisedSwapVals(i,null,a||!0),(document.documentElement.className.match("translated")||L()||function(){for(var t=document.getElementsByClassName("view-in-ga-link-logo"),e=0;e<t.length;e++){var r=t[e];if(/chrome-extension:\/\/.+analytics_logo\.png/.test(getComputedStyle(r)["background-image"]))return!0}return!1}())&&(m=!0,d.removeNewSrcs()),!b&&(!d.needsUVMigrationReportForUnreportableDomain()&&!o.a.c("Data").dynamicValues()||!function(){if(void 0===w){var t=o.a.c("Data").reportLotRatio();w=t>Math.random()}return w}()||h>=10||g>=10||!function(){for(var t in e)if(e.hasOwnProperty(t))return!0;return!1}()||!r)||(C(),b=!1),t&&setTimeout(t,0)}}function L(t){var e=o.a.c("Interface").getStandardWidgetElement();if((t=t||e&&e.querySelectorAll(".wovn-switch"))&&t.length>0)for(var r=0;r<t.length;r++){var a=t[r].getAttribute("data-value"),n=a&&o.a.c("Lang").get(a),i=n&&n.name;if(i&&i!==t[r].innerHTML)return!0}return!1}this.reportCount=function(){return h},this.reportSuccessCount=function(){return p},this.resetReportCount=function(){h=0,clearTimeout(f)},this.needsUVMigrationReportForUnreportableDomain=function(){return!o.a.c("Data").dynamicValues()&&o.a.c("Data").useUnifiedValuesMigrating()},this.audit=U,this.isLanguageTranslated=L,this.removeNewSrcs=function(){for(var a in e)t.hasOwnProperty(a)&&delete t[a];e={},r=!1},this.stop=function(){A(),o.a.c("AuditTrigger").stop()},this.destroy=function(){d.stop()},this.mustEnsureOneReport=function(){return!!o.a.c("Data").hasFastReportNewPagesFeature()&&(o.a.c("Lang").missingAutoTranslateLangs()||o.a.c("Lang").missingAutoPublishLangs())},o.a.c("Url").isIframeLiveEditor()||(m=o.a.c("Agent").mutatesTextNodeData(),!0===(v=this.mustEnsureOneReport())&&(a=1e3),b=!!(o.a.c("Lang").missingAutoTranslateLangs()||o.a.c("Lang").missingAutoPublishLangs()||o.a.c("ValueStore").corruptedVals&&o.a.c("ValueStore").corruptedVals.length>0&&Math.random()<.1||location.hash.match(/wovn.forceReporting/)))},document.WOVNIO.components.SwapIntercom=function(){var t={subscribe:"WOVNIO_SWAP_INTERCOM_SUBSCRIBE",unsubscribe:"WOVNIO_SWAP_INTERCOM_UNSUBSCRIBE",acknowledge:"WOVNIO_SWAP_INTERCOM_ACKNOWLEDGE",swap:"WOVNIO_SWAP_INTERCOM_SWAP"},e=null;this.start=function(){o.a.c("Utils").pageIsWidgetPreview()||(e=this.isMasterIntercom()?this.createParentNode():this.createChildNode()).start()},this.stop=function(){e.stop()},this.isMasterIntercom=function(){return window.self===window.top},this.createParentNode=function(){return new function(){var e=[];function r(r){switch(r.data){case t.subscribe:var n=r.source;(function(r){return!o.a.c("Utils").includes(e,r)&&(e.push(r),r.postMessage(t.acknowledge,"*"),!0)})(n)&&a(n,o.a.c("Lang").getDocLang());break;case t.unsubscribe:!function(t){var r=o.a.c("Utils").indexOf(e,t);r>=0&&e.splice(r,1)}(r.source)}}function a(e,r){e&&e.postMessage(t.swap+":"+r,"*")}function n(){for(var t=o.a.c("Lang").getDocLang(),r=0;r<e.length;++r)a(e[r],t)}this.start=function(){o.a.c("Utils").onEvent(window.self,"message",r),o.a.c("Utils").addEventListener("wovnLangChanged",n)},this.stop=function(){o.a.c("Utils").removeHandler(window.self,"message",r),document.removeEventListener("wovnLangChanged",n)}}},this.createChildNode=function(){return new function(){var e=window.top,r=null,a=0;function n(e){if("string"==typeof e.data){var a=e.data.split(":");switch(a[0]){case t.acknowledge:clearTimeout(r),o.a.c("Interface").destroy();break;case t.swap:var n=a[1];o.a.c("Lang").setDocLang(n)}}}function i(){e&&(a+=1,e.postMessage(t.subscribe,"*"),r=setTimeout(i,1e3*a))}function s(){clearTimeout(r),e.postMessage(t.unsubscribe,"*")}this.start=function(){o.a.c("Utils").onEvent(window.self,"message",n),o.a.c("Utils").onEvent(window.self,"beforeunload",s),a=0,i()},this.stop=function(){o.a.c("Utils").removeHandler(window.self,"message",n),o.a.c("Utils").removeHandler(window.self,"beforeunload",s),s()}}}},document.WOVNIO.components.UnifiedValue=d,document.WOVNIO.components.ValueStore=function(t){var e=this,r=t.c("Data").getPublishedLangs(),a=t.c("Lang").getDefaultCodeIfExists();if(t.isComponentLoaded("LiveEditorDecorator")&&(a=t.c("LiveEditorDecorator").get_dummy_lang_code()),a){var n=t.c("Data").getTranslationData(),i=t.c("TranslationDataBridge").loadFromStore();i.update(n),i.storeToStorage();var o={},s={},c={};o[a]=i.textVals,s[a]=i.calcImgValsForIndex(),c[a]=i.htmlTextVals;var u=t.c("Data").get().prop_vals||{},d=[],f=[a],g="http://st.wovn.io/ImageValue/"+t.c("Data").getPageId()+"/",h=[],p={},m="wovn-src:",v=",wovn-actual-lang:",b="data-wovn-original-background";this.srcsetOriginalValueStore={},this.propertyIndexTags=function(){return d},this.imgSrcPrefix=function(){return g},this._nodeToSrc=function(r,a,n){var i="",o=r.nodeName.toLowerCase();if("#text"==o)return t.c("Utils").normalizeText(r.data.replace("<","&lt;").replace(">","&gt;"),!0);if("br"==o||"img"==o)return"<"+o+">";var s="",c=x(r);if(a||!1===c)for(var u=r.childNodes,l=0;l<u.length;l++)s+=t.c("Utils").normalizeText(e._nodeToSrc(u[l],a,!0),!0);return i=n?c?"<"+o+" wovn-ignore>"+s+"</"+o+">":"<"+o+">"+s+"</"+o+">":s,t.c("Utils").normalizeText(i,!0)},this.getDstImage=function(t,e){if(!t)return null;var r=S(t,s[a]);return r&&r[e]?r[e][0].data:void 0},this.addPropertyIndexTag=function(t,e){u[t]=u[t]||[],u[t][e]||(u[t][e]=[],T())},N(),T(),O(),this.getTextIndex=function(){return o},this.getImgIndex=function(){return s},this.getHtmlTextIndex=function(){return c},this.corruptedVals=h,this.isCorrupted=function(t){return I(t)},this.addValues=function(e){e=e||[];for(var r=0;r<e.length;r++)if(!I(e[r])){var n,i,u;/img(\[[^\]]*\])?$/.test(e[r].xpath)||e[r].src_img_path||/\[@background-image\]$/.test(e[r].xpath)?(n=s[a],i=e[r].src||e[r].src_img_path,(u=e[r].dst||e[r].img_path)!==i&&(u=g+u)):(n=!0===e[r].complex?c[a]:o[a],i=t.c("Utils").trimString(e[r].hasOwnProperty("src")?e[r].src:e[r].src_body),u=t.c("Utils").trimString(e[r].hasOwnProperty("dst")?e[r].dst:e[r].body)||"​");var l=e[r].language;t.c("Utils").pushUnique(f,l),n.hasOwnProperty(i)||(n[i]={},n[i][a]=[]),n[i][a].push({xpath:(e[r].xpath||"").replace(/\[1\]/g,""),data:i}),l&&(n[i].hasOwnProperty(l)||(n[i][l]=[]),n[i][l].push({xpath:(e[r].xpath||"").replace(/\[1\]/g,""),data:u}))}t.c("Agent").mutatesTextNodeData()&&O()},this.noteMissedValueIfNeeded=function(e,r){var a=t.c("Lang").getDefaultCodeIfExists();a&&r!==a&&t.c("ValueStore").noteMissedValue(e)},this.noteMissedValue=function(t){p.hasOwnProperty(t)||(p[t]=!1)},this.loadNewDetectedValue=function(){var e=[];for(var r in p)if(p.hasOwnProperty(r)&&!p[r]&&(p[r]=!0,e.push(r),e.length>=100))break;0!==e.length&&t.loadTranslation(e,function(e){t.c("Data").useUnifiedValue()?(t.c("ValueStore").mergeValues({},e.img_vals,e.text_vals),t.c("UnifiedValue").refreshTranslation()):t.c("ValueStore").mergeValues(e.text_vals,e.img_vals)},function(){})},this.mergeValues=function(e,r,n){var i=t.c("TranslationDataBridge").loadFromStore(),c=t.c("TranslationDataBridge").create((new Date).getTime(),e,r,n);i.update(c),i.storeToStorage();for(var u=[],l=c.calcImgValsForIndex(),d=[[e,o],[l,s]],f=0;f<d.length;f++){var g=d[f][0],h=d[f][1];for(var p in g)if(g.hasOwnProperty(p)){var m=g[p];h[a][p]=m;for(var v=Object.keys(m),b=0;b<v.length;b++)t.c("Utils").pushUnique(u,v[b])}}N();for(var y=0;y<u.length;y++)V(u[y])},this.srcExists=function(e,r){o[r]||V(r);var a=t.c("NodeContainer").create(e),n=this.getData(a);return""===n||j(a,r).hasOwnProperty(n)},this.replaceAllPropertyIndex=function(t,e){(u={})[t]=e,T(t)},this.applyPropertySetting=function(r,a,n){n&&M(r);var i=e.getProperty(t.c("NodeContainer").create(r),a);i&&_(i.dst,r,null)},this.getProperty=function(t,e){if(!u[e]||!u[e][t.nodeName])return null;for(var r=[],a=0;a<u[e][t.nodeName].length;a++){var n=u[e][t.nodeName][a];P(n,t.node)&&r.push(n)}return function(t,e){for(var r=-1,a=null,n=0;n<t.length;n++){var i=t[n],o=k(i.dst.selectors,e);o>0&&r<=o&&(a=i,r=o)}return a||null}(r,t.node)},this.getSrcChildTextContent=function(r){for(var a="",n=function(t){return e.getChildNodesOverrideFunc?e.getChildNodesOverrideFunc(t):t.childNodes}(r),i=0;i<n.length;i++){var o=t.c("NodeContainer").create(n[i]);if("#text"===o.nodeName){var s=t.c("ValueStore").getDefaultValue(o,"");s&&s.data&&(a+=t.c("Utils").normalizeText(s.data))}}return a},this.setProperty=function(t,r){_(t,r,e.getOriginalProperties(r))},this.getOriginalProperties=function(e){if(e.getAttribute){var r=e.getAttribute("data-wovn-original-property");if(r)return t.c("Utils").parseJSON(r)}return null},this.getParentElementOverrideFunc=void 0,this.getChildNodesOverrideFunc=void 0,this.getByValue=function(r,n,i){var o=r.node,s=this.getData(r),c=o.actualLang||t.c("Lang").getActualLang();if(!c)return null;if(!t.c("Agent").canStoreObjectInNode()&&/text/i.test(r.nodeName))return function(e,r,n,i){var o=r.node,s=t.c("Lang").getActualLang(),c=function(t){var e=z(t.node);if(e){var r=e.data.indexOf(v);return-1===r?null:e.data.substring(r+v.length)}return null}(r)||s;if(c&&s){V(c);var u=j(r,c),l=W(r,u);if(l||!t.c("Utils").isEmpty(e)){var d=t.c("Lang").getDefaultCodeIfExists();if(d&&(l||i!==d)){if(!l||!1===function(e,r,a,n,i){var o=a[e]&&E(L(a[e],i),n);return o&&t.c("Utils").normalizeText(o.data)===t.c("Utils").normalizeText(r)}(s,e,l,r,n)){if(!(l=B(r,u,e)))return;!function(t,e,r){var n=z(t),i=m+e[a][0].data+v+r;if(n)n.data=i;else{var o=document.createComment(i);(t=$(t)).parentNode&&t.parentNode.insertBefore(o,t)}}(o,l,i)}return E(L(l[i]||[],n),r)}}}}(s,r,n,i);var u=o.wovnTranslation;if(!u||"object"!==l(u)){var d=t.c("Lang").getDefaultCodeIfExists();if(!d)return null;if(i===d&&!function(e){return!(0!=t.c("DomAuditor").isSwappedMoreThanOnce||!t.c("Config").backend())&&t.c("Lang").getActualLang()!==t.c("Lang").getDefaultCodeIfExists()&&null!==z(e)}(o))return null;V(c);var f=j(r,c),g=function(e,r,a){if(0==t.c("DomAuditor").isSwappedMoreThanOnce&&t.c("Config").backend()){var n=W(e,r);if(n)return n}return B(e,r,a)}(r,f,s);try{o.wovnTranslation=g}catch(t){var h=f[s]&&(f[s][i]||f[s][a]);return h||(h=[]),E(L(h,n),r)}if(null==g)return null}return e.validateCache(r,n,i),o.wovnTranslation?E(L(o.wovnTranslation[i]||[],n),r):null},this.translateTexts=function(t,e,r){C(o,t);for(var a=o[t]||{},n={},i=0;i<r.length;i++){var s=r[i];a[s]&&a[s][e]&&a[s][e][0]?n[s]=a[s][e][0].data:n[s]=null}return n},this.getCachedOriginalSrcsetAttribute=function(t){return(this.srcsetOriginalValueStore[t]||{})[t.value]},this.cacheOriginalSrcsetAttribute=function(t,e){this.srcsetOriginalValueStore.hasOwnProperty(t)||(this.srcsetOriginalValueStore[t]={}),this.srcsetOriginalValueStore[t][t.value]=e},this.getSrcValuesFromSrcsetAttribute=R,this.replaceSrcsetNode=function(t,e,r){var n=this.getCachedOriginalSrcsetAttribute(t)||t.value;V(a);var i=s[a],o=R(n),c=function(t,e,r,a,n){if(t){var i=t;for(var o in e)if(e.hasOwnProperty(o)){var s=e[o];if(r[o]){var c=L(r[o][a]||[],n);c&&c.data&&(i=i.replace(s,c.data))}}return i}}(n,o,i,r,e);return c?(t.value=c,this.cacheOriginalSrcsetAttribute(t,n),o):[]},this.getByComplexValue=function(e,r,n){var i=q(e,!1);V(n);var o=function(e,r,n){var i=H(r);if(i.hasOwnProperty(n))return i[n];var o=t.c("Utils").normalizeText(n);return i.hasOwnProperty(o)?i[o]:H(a)[o]||void 0}(0,t.c("Lang").getDocLang(),i);return o&&o[n]&&o[n].length>0?o[n][0]:null},this.getTranslationDataFromIndex=function(t,e,r){return r.hasOwnProperty(t)?r[t]:G(e)?S(t,r):null},this.getDefaultValue=function(t,r){return this.getByValue(t,r,a)||{data:e.getData(t,!0)}},this.getDefaultComplexValue=function(t,e){return this.getByComplexValue(t,e,a)||{data:q(t,!1)}},this.validateCache=function(e,r,n){var i=e.node,o=i.wovnTranslation;if(o&&"object"===l(o)){var s=this.getData(e),c=i.actualLang||t.c("Lang").getActualLang();if(c){var u=o[c],d=u&&E(L(u,r),e),f=t.c("Utils").normalizeText(s);if(!d||t.c("Utils").normalizeText(d.data)!==f){V(c);var g=j(e,c),h=this.getTranslationDataFromIndex(f,e,g);if(!h){var p=j(e,a);h=this.getTranslationDataFromIndex(f,e,p)}i.wovnTranslation=h}}}},this.getData=function(e,r){var a,n,i=e.node;if(function(t){return-1!==y.indexOf(t)}(e.getUpperNodeName()||i.name.toUpperCase()))a=r?i.value:t.c("Utils").normalizeText(i.value);else if(G(e))if(i.getAttribute){if(a=(n=i.getAttribute("src"))?i.src:"","path"===t.tag.getAttribute("urlPattern")&&!/^(https?:\/\/|\/)/.test(n)){var o=t.c("Lang").getDefaultCodeIfExists();o&&(a=t.c("Url").getUrl(o,a,!0))}}else a=i.src;else{if(t.c("Node").isLegitimateNode(e))a=e.data;else{if(!t.c("Node").isFirstTextNode(i))return"";a=t.c("Node").wholeText(i)}!0!==r&&(a=t.c("Utils").normalizeText(a))}return a},this.getOriginalComplexData=function(t){return e._nodeToSrc(t,!0,!1)};var y=["ALT","VALUE","PLACEHOLDER","DATA-CONFIRM","DATA-DISABLE-WITH","CONTENT","LABEL","TITLE"];this.replaceData=function(e,r,a){if(r){var n=e.node,i=e.nodeName;switch(!0){case new RegExp(y.join("|"),"i").test(i||n.name):Y(n,r,a);break;case/#text/i.test(i):Z(e,r,a);break;case/img/i.test(i)||!(!/input/i.test(i)||!n.src):!function(e,r,a){var n=t.c("Lang").getDefaultCodeIfExists();if(n){if("path"===t.tag.getAttribute("urlPattern")){var i=location.hostname;location.port&&(i=i+":"+location.port),t.c("Url").getDomainPort(r).toLowerCase()==i&&(r=t.c("Url").getUrl(n,r))}e.actualLang=a,e.src!==r&&Y(e.getAttributeNode("src"),r,a)}}(n,r,a)}}},this.replaceAttribute=function(t,e,r,a){var n=t.node.getAttributeNode(e);t.node.actualLang=a,Y(n,r,a)};var w={};this.replaceComplexData=function(e,r,a){!function e(r,a,n){if(1!==r.nodeType)Z(t.c("NodeContainer").create(r),a);else{if(x(r))return;var i=r.childNodes;if(i.length>0){var o=n||w[a];if(!o){var s=document.createElement(r.tagName);s.innerHTML=a,function t(e,r){for(var a=0;a<e.childNodes.length;a++)if(e.childNodes[a].childNodes.length>0)t(e.childNodes[a],r.childNodes[a]);else if(!J(r)){if(r.childNodes.length<=a&&J(e.childNodes[a])){var n=document.createTextNode("");r.insertBefore(n,null)}if(void 0!==r.childNodes[a]&&e.childNodes[a].nodeName!==r.childNodes[a].nodeName&&J(e.childNodes[a])){var i=document.createTextNode("");r.insertBefore(i,r.childNodes[a])}}}(r,s),o=function t(e){var r=[];if(1!==e.nodeType)r.push(e.data);else for(var a=e.childNodes,n=0;n<a.length;++n){var i=a[n],o=t(a[n]);1!==i.nodeType?r=r.concat(o):r.push(o)}return r}(s),w[a]=o}for(var c=0,u=0;u<i.length;++u){var l=o[c];e(i[u],l,o[c]),c++}}}}(e.node,r,a),e.refreshData()},this.replaceText=Z,this.revertImage=function(t){if("none"!==t.style.backgroundImage){var e=X(t);(e||""===e)&&(t.style.backgroundImage=e)}},this.replaceCssImageData=function(t,e){var r=X(t);if(r||""===r||function(t){t.setAttribute(b,t.style.backgroundImage||"")}(t),e.length>0){var a=[];e.forEach(function(t){a.push("url("+t+")")}),t.style.backgroundImage=a.join(", ")}else t.style.backgroundImage=""},this.getTranslatedLangs=function(){return f},this.empty=function(){for(var t in o[a])if(o[a].hasOwnProperty(t))return!1;for(var e in c[a])if(c[a].hasOwnProperty(e))return!1;for(var r in s[a])if(s[a].hasOwnProperty(r))return!1;return!0},this.getNewDetectedValueSet=function(){return p}}function x(t){return t.hasAttribute&&t.hasAttribute("wovn-ignore")}function N(){A(s),A(o),A(c)}function A(t){var e=t[a];for(var r in e){var n=e[r],i="";for(var o in n){i=n[o][0].xpath;break}n[a]||(n[a]=[{data:r,xpath:i}])}}function T(e){var a=r;e&&(a=[e]);for(var n={},i=0;i<a.length;i++){var o=a[i];if(u[o])for(var s=t.c("Utils").keys(u[o]),c=0;c<s.length;c++)n[s[c]]=!0}d=t.c("Utils").keys(n)}function S(t,e){if(e.hasOwnProperty(t))return e[t]}function O(){for(var t in o)D(o,t);for(t in c)D(c,t)}function D(r,a){for(var n in r[a])if(r[a].hasOwnProperty(n)){var i=n;if(r===c){var o=document.createElement("P");o.innerHTML=i,i=e._nodeToSrc(o,!1,!1)}else i=t.c("Utils").normalizeText(n);if(i!==n){var s=r[a][n];for(var u in s)if(s.hasOwnProperty(u))for(var l in s[u])s[u].hasOwnProperty(l);r[a][i]=s,delete r[a][n]}}}function I(t){return"object"!==l(t)?(h.push(t),!0):t.hasOwnProperty("src")&&t.hasOwnProperty("dst")&&t.hasOwnProperty("language")?t.src===t.dst&&(h.push(t),!0):(h.push(t),!0)}function V(t){C(o,t),C(c,t),C(s,t)}function C(e,r){var n=function(e,r){for(var a=0;a<e.length;++a)t.c("Utils").findIndex(r,e[a],function(t,e){return t.data===e.data&&t.xpath===e.xpath})&&r.push(e[a])};if(!e[r]){for(var i in e[r]={},e[a])if(e[a].hasOwnProperty(i)){var s=e[a][i];if(s[r])for(var u=0;u<s[r].length;u++){var l=s[r][u].data,d=e[r][l];for(var f in d||(d={},e[r][l]=d),s)if(s.hasOwnProperty(f)){if(!f||!s[f])continue;d[f]||(d[f]=[]),n(s[f],d[f])}}}e!==o&&e!==c||D(e,r)}}function U(t,e){for(var r=0,a=t.length-1,n=e.length-1;a>=0&&n>=0;){if(t[a]!==e[n])return r;"/"===t[a]&&r++,a--,n--}return r}function L(t,e){if(!t||0===t.length)return null;if(1===t.length)return t[0];for(var r=t[0],a=U(e,t[0].xpath),n=0,i=1;i<t.length;i++)(n=U(e,t[i].xpath))>a&&(r=t[i],a=n);return r}function E(e,r){var a=r.data||t.c("ValueStore").getData(r);return e&&t.c("Utils").normalizeText(e.data)===t.c("Utils").normalizeText(a)&&(e.data=a),e}function P(t,r){for(var a in t.src_property)if(t.src_property.hasOwnProperty(a)){if("childTextContent"===a)return t.src_property[a]===e.getSrcChildTextContent(r);if(window.getComputedStyle(r)[a]!==t.src_property[a])return!1}return!0}function k(e,r){for(var a=r,n=0,i=0;i<e.length;i++){a=F(a);var o=e[i];if(a.nodeName.toUpperCase()!==o.tag_name.toUpperCase())return-1;if(a.parentNode.children)for(var s=a.parentNode.children,c=o.position||0,u=0,l=0;l<s.length;l++){var d=s[l];if(d.nodeName.toUpperCase()==o.tag_name.toUpperCase()){if(u===c){if(a!==d)return-1;break}u++}}if(n++,a.getAttribute("id")==o.element_id&&(n+=10),o.classes&&a.className)for(var f=o.classes,g=t.c("Utils").to_set(a.className.split(/\s+/)),h=0;h<f.length;h++)g[f[h]]&&(n+=10/f.length)}return n}function _(e,r,a){M(r);var n=t.c("Utils").keys(e.style);a=a||{style:{}};for(var i=0;i<n.length;i++){var o=n[i];0==a.style.hasOwnProperty(o)&&(a.style[o]=r.style[o]),r.style[o]=e.style[o];var s=o.replace(/([A-Z])/,"-$1").toLowerCase(),c=new RegExp("(("+s+": [^;]+?)( !important)?);","g");r.style.cssText=r.style.cssText.replace(c,"$1 !important;")}!function(t,e){r.setAttribute("data-wovn-original-property",JSON.stringify(t))}(a)}function M(r){var a=e.getOriginalProperties(r);if(a&&a.style)for(var n=a.style,i=t.c("Utils").keys(n),o=0;o<i.length;o++){var s=i[o];r.style[s]=n[s]}}function F(t){return e.getParentElementOverrideFunc?e.getParentElementOverrideFunc(t):t.parentNode}function R(e){var r=/\s+[^\s]+$/,a=e.match(/[^\s,]+(\s+[^\s,]+)?/g),n={};for(var i in a)if(a.hasOwnProperty(i)){var o=a[i].replace(r,""),s=t.c("UrlFormatter").createFromUrl(o);s.setShowFullUrl(),n[s.getOriginalUrl()]=o}return n}function B(r,n,i){if(n.hasOwnProperty(i))return n[i];var o=t.c("Utils").normalizeText(i),s=e.getTranslationDataFromIndex(o,r,n);if(s)return s;var c=j(r,a);return(s=e.getTranslationDataFromIndex(o,r,c))||void 0}function z(t){var e=$(t).previousSibling;return e&&"#comment"===e.nodeName&&0===e.data.indexOf(m)?e:null}function W(e,r){var a=z(e.node);if(a){var n,i=a.data.indexOf(v);if((n=-1==i?a.data.substring(m.length):a.data.substring(m.length,i)).length)return B(e,r,t.c("Utils").decodeHTMLEntities(n))}return null}function $(e){var r=e.parentElement||e.parentNode;return r?t.c("DomAuditor").isSwappedMoreThanOnce&&"TITLE"===r.nodeName?r:e:e.ownerElement}function j(t,e){var r;if(e||(e=[a]),"string"==typeof e&&(e=[e]),"IMG"===t.nodeName)for(;!r&&e.length>0;)r=s[e.shift()];else if("INPUT"===t.nodeName)for(;!r&&e.length>0;)r=s[e.shift()];else if("META"===t.nodeName)for(;!r&&e.length>0;)r=o[e.shift()];else for(;!r&&e.length>0;)r=o[e.shift()];return r}function H(t){return c[t]||V(t),c[t]}function q(t,r){return e._nodeToSrc(t,r,!1)}function G(t){return"IMG"===t.nodeName||!("INPUT"!==t.nodeName||!t.node.src)||void 0}function J(t){return 3===t.nodeType}function Z(t,e,r){if(void 0!==e){var a=t.data,n=a.replace(/^(\s*)[\s\S]*?(\s*)$/,"$1"+e.replace(/^\s+/,"").replace(/\s+$/,"").replace(/\$/g,"$$$$")+"$2");a!==n&&t.replaceData(n,r)}}function X(t){return t.getAttribute(b)}function Y(t,e,r){t&&t.value!==e&&(t.value=e,t.actualLang=r)}}},3:function(t,e){var r;r=function(){return this}();try{r=r||new Function("return this")()}catch(t){"object"==typeof window&&(r=window)}t.exports=r},34:function(t,e,r){"use strict";(function(e){var a=r(138),n=r(139),i=/^([a-z][a-z0-9.+-]*:)?(\/\/)?([\S\s]*)/i,o=/^[A-Za-z][A-Za-z0-9+-.]*:\/\//,s=[["#","hash"],["?","query"],function(t){return t.replace("\\","/")},["/","pathname"],["@","auth",1],[NaN,"host",void 0,1,1],[/:(\d+)$/,"port",void 0,1],[NaN,"hostname",void 0,1,1]],c={hash:1,query:1};function u(t){var r,a=("undefined"!=typeof window?window:void 0!==e?e:"undefined"!=typeof self?self:{}).location||{},n={},i=typeof(t=t||a);if("blob:"===t.protocol)n=new d(unescape(t.pathname),{});else if("string"===i)for(r in n=new d(t,{}),c)delete n[r];else if("object"===i){for(r in t)r in c||(n[r]=t[r]);void 0===n.slashes&&(n.slashes=o.test(t.href))}return n}function l(t){var e=i.exec(t);return{protocol:e[1]?e[1].toLowerCase():"",slashes:!!e[2],rest:e[3]}}function d(t,e,r){if(!(this instanceof d))return new d(t,e,r);var i,o,c,f,g,h,p=s.slice(),m=typeof e,v=this,b=0;for("object"!==m&&"string"!==m&&(r=e,e=null),r&&"function"!=typeof r&&(r=n.parse),e=u(e),i=!(o=l(t||"")).protocol&&!o.slashes,v.slashes=o.slashes||i&&e.slashes,v.protocol=o.protocol||e.protocol||"",t=o.rest,o.slashes||(p[3]=[/(.*)/,"pathname"]);b<p.length;b++)"function"!=typeof(f=p[b])?(c=f[0],h=f[1],c!=c?v[h]=t:"string"==typeof c?~(g=t.indexOf(c))&&("number"==typeof f[2]?(v[h]=t.slice(0,g),t=t.slice(g+f[2])):(v[h]=t.slice(g),t=t.slice(0,g))):(g=c.exec(t))&&(v[h]=g[1],t=t.slice(0,g.index)),v[h]=v[h]||i&&f[3]&&e[h]||"",f[4]&&(v[h]=v[h].toLowerCase())):t=f(t);r&&(v.query=r(v.query)),i&&e.slashes&&"/"!==v.pathname.charAt(0)&&(""!==v.pathname||""!==e.pathname)&&(v.pathname=function(t,e){for(var r=(e||"/").split("/").slice(0,-1).concat(t.split("/")),a=r.length,n=r[a-1],i=!1,o=0;a--;)"."===r[a]?r.splice(a,1):".."===r[a]?(r.splice(a,1),o++):o&&(0===a&&(i=!0),r.splice(a,1),o--);return i&&r.unshift(""),"."!==n&&".."!==n||r.push(""),r.join("/")}(v.pathname,e.pathname)),a(v.port,v.protocol)||(v.host=v.hostname,v.port=""),v.username=v.password="",v.auth&&(f=v.auth.split(":"),v.username=f[0]||"",v.password=f[1]||""),v.origin=v.protocol&&v.host&&"file:"!==v.protocol?v.protocol+"//"+v.host:"null",v.href=v.toString()}d.prototype={set:function(t,e,r){var i=this;switch(t){case"query":"string"==typeof e&&e.length&&(e=(r||n.parse)(e)),i[t]=e;break;case"port":i[t]=e,a(e,i.protocol)?e&&(i.host=i.hostname+":"+e):(i.host=i.hostname,i[t]="");break;case"hostname":i[t]=e,i.port&&(e+=":"+i.port),i.host=e;break;case"host":i[t]=e,/:\d+$/.test(e)?(e=e.split(":"),i.port=e.pop(),i.hostname=e.join(":")):(i.hostname=e,i.port="");break;case"protocol":i.protocol=e.toLowerCase(),i.slashes=!r;break;case"pathname":case"hash":if(e){var o="pathname"===t?"/":"#";i[t]=e.charAt(0)!==o?o+e:e}else i[t]=e;break;default:i[t]=e}for(var c=0;c<s.length;c++){var u=s[c];u[4]&&(i[u[1]]=i[u[1]].toLowerCase())}return i.origin=i.protocol&&i.host&&"file:"!==i.protocol?i.protocol+"//"+i.host:"null",i.href=i.toString(),i},toString:function(t){t&&"function"==typeof t||(t=n.stringify);var e,r=this,a=r.protocol;a&&":"!==a.charAt(a.length-1)&&(a+=":");var i=a+(r.slashes?"//":"");return r.username&&(i+=r.username,r.password&&(i+=":"+r.password),i+="@"),i+=r.host+r.pathname,(e="object"==typeof r.query?t(r.query):r.query)&&(i+="?"!==e.charAt(0)?"?"+e:e),r.hash&&(i+=r.hash),i}},d.extractProtocol=l,d.location=u,d.qs=n,t.exports=d}).call(this,r(3))},37:function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var a=r(0),n=function(){function t(){}return t.prototype.translate=function(t,e,r,n){var i=this.buildUrl(t);a.default.c("Utils").sendRequest("GET",i+"&src="+encodeURIComponent(e),null,function(t,e){return r(JSON.parse(t),e)},n)},t.prototype.buildUrl=function(t){var e=a.default.c("RailsBridge").requestWidgetHost;return e+="/v0/instant_translate",e+="?token="+a.default.tag.getAttribute("key"),(e+="&tgt_lang="+encodeURIComponent(t))+"&unified=true"},t}();e.default=n},79:function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.filterValuesByTranslationData=function(t,e,r){return function(t,e){return t.filter(function(t){return e.indexOf(t.src)<0})}(t,e.getTextValuesByLangs(r))}}});
!function(t){var e={};function a(n){if(e[n])return e[n].exports;var i=e[n]={i:n,l:!1,exports:{}};return t[n].call(i.exports,i,i.exports,a),i.l=!0,i.exports}a.m=t,a.c=e,a.d=function(t,e,n){a.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},a.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},a.t=function(t,e){if(1&e&&(t=a(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(a.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var i in t)a.d(n,i,function(e){return t[e]}.bind(null,i));return n},a.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return a.d(e,"a",e),e},a.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},a.p="",a(a.s=84)}([function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.prototype.c=function(t){return this.instance().c(t)},Object.defineProperty(t.prototype,"tag",{get:function(){return this.instance()?this.instance().tag:{getAttribute:function(){}}},enumerable:!0,configurable:!0}),t.prototype.instance=function(){return window.WOVN&&window.WOVN.io&&window.WOVN.io._private?window.WOVN.io._private.widget:null},t.prototype.isBackend=function(){return this.tag.getAttribute("backend")},t.prototype.getBackendCurrentLang=function(){return this.tag.getAttribute("currentLang")},t.prototype.getBackendDefaultLang=function(){return this.tag.getAttribute("defaultLang")},t.prototype.isComponentLoaded=function(t){return!!this.instance()&&this.instance().isComponentLoaded()},t.prototype.isTest=function(){return this.instance().isTest||!1},t.prototype.loadTranslation=function(t,e,a){this.instance()&&this.instance().loadTranslation(t,e,a)},t.prototype.reloadData=function(t){this.instance()&&this.instance().reloadData(t)},t.prototype.loadPreviewData=function(t,e,a){this.instance().loadPreviewData(t,e,a)},t.prototype.loadDataJson=function(t){this.instance().loadDataJson(t)},t.prototype.reinstallComponent=function(t){this.instance().reinstallComponent(t)},t.prototype.loadDomainOption=function(t,e){this.instance().loadDomainOption(t,e)},t.prototype.loadComponents=function(t,e){this.instance().loadComponents(t,e)},t.prototype.loadSavedData=function(t,e){this.instance().loadSavedData(t,e)},t}();e.default=new n},,function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default={WIDGET_ID:"wovn-translate-widget",BUILT_IN_WIDGET_ID:"wovn-languages",IS_DEV:!1,STALLION_IFRAME_ID:"wovn-stallion-iframe",STALLION_MESSAGE_TYPES:{sync:"WOVN_STALLION_READY",request:"WOVN_STALLION_REQUEST",response:"WOVN_STALLION_RESPONSE"}}},function(t,e){var a;a=function(){return this}();try{a=a||new Function("return this")()}catch(t){"object"==typeof window&&(a=window)}t.exports=a},,,,function(module,exports,__webpack_require__){"use strict";Object.defineProperty(exports,"__esModule",{value:!0});var md5=__webpack_require__(97),domready=__webpack_require__(100),Widget_1=__webpack_require__(0),Agent_1=__webpack_require__(35),Constant_1=__webpack_require__(2),hasComputedStyleCache=void 0,browserFingerprint,addedEvents=[],wovnEmptyCharacter="​";function hasComputedStyle(){return void 0===hasComputedStyleCache&&(hasComputedStyleCache=!!window.getComputedStyle),hasComputedStyleCache}function createJsonHandler(t,e){return function(a,n){if(a){try{var i=JSON.parse(a)}catch(t){return void e()}t(i,n)}else e()}}function jsonReviver(t,e,a){var n,i,o=t[e];if(o&&"object"==typeof o)for(n in o)Object.prototype.hasOwnProperty.call(o,n)&&(void 0!==(i=jsonReviver(o,n,a))?o[n]=i:delete o[n]);return a.call(t,e,o)}function trimText(t,e){var a=t;return Agent_1.default.mutatesTextNodeData()&&(a=a.replace(/([^\u0000-\u007F])\n([^\u0000-\u007F])/g,"$1$2")),a.replace(e," ").replace(/^[\s\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]+|[\s\u00A0\uFEFF\u1680\u180E\u2000-\u200A\u202F\u205F\u3000]+$/g,"")}var removesZeroWidthByTrim=void 0,Utils=function(){function Utils(){this.normalizeTextCache={},this.normalizeTextCacheWithoutZeroWidthSpace={}}return Utils.prototype.pageIsWidgetPreview=function(){return/fake_page\/blank/.test(window.location.pathname)&&/wovn\.(io|com)/.test(window.location.hostname)},Utils.prototype.createInitEvent=function(t,e,a){var n=null;return document.createEvent?(n=document.createEvent("Event")).initEvent(t,e,a):document.createEventObject&&(n=document.createEventObject()),n},Utils.prototype.addEventListener=function(t,e){document.addEventListener?document.addEventListener(t,e):document.createEventObject&&document.attachEvent(t,e)},Utils.prototype.dispatchEvent=function(t){document.dispatchEvent?document.dispatchEvent(t):document.createEventObject&&document.documentElement[t]++},Utils.prototype.getMetaElement=function(t,e){e||(e={});for(var a=document.getElementsByTagName("meta"),n=0;n<a.length;++n)if(a[n].getAttribute("name")===t){var i=!0;for(var o in e)if(e.hasOwnProperty(o)&&e[o]!==a[n].getAttribute(o)){i=!1;break}if(i)return a[n]}return null},Utils.prototype.getElementsByClassName=function(t,e){if("function"==typeof document.getElementsByClassName)return t.getElementsByClassName(e);for(var a=[],n=new RegExp("(^| )"+e+"( |$)"),i=t.getElementsByTagName("*"),o=0,r=i.length;o<r;o++)(n.test(i[o].className)||n.test(i[o].getAttribute("class")))&&a.push(i[o]);return a},Utils.prototype.canStyleChange=function(t){if(!hasComputedStyle())return!1;if(!t.style)return!1;var e=t.nodeName;return"META"!==e&&"IMG"!==e&&"#text"!==e&&"#comment"!==e},Utils.prototype.onEvent=function(t,e,a){e=e.replace(/^on(.)/i,function(t,e){return e.toLowerCase()}),t.addEventListener?t.addEventListener(e,a,!1):t.attachEvent&&t.attachEvent("on"+e,a),addedEvents.push([t,e,a])},Utils.prototype.removeHandler=function(t,e,a){t.removeEventListener?t.removeEventListener(e,a,!1):t.detachEvent&&t.detachEvent("on"+e,a)},Utils.prototype.getReadyState=function(){return document.readyState},Utils.prototype.onLoadingComplete=function(t){var e=this;"complete"===this.getReadyState()?t():setTimeout(function(){e.onLoadingComplete(t)},100)},Utils.prototype.onDomReady=function(t){domready(t)},Utils.prototype.sendRequestAsJson=function(t,e,a,n){var i=createJsonHandler(a,n);this.sendRequest(t,e,null,i,n)},Utils.prototype.postJsonRequest=function(t,e,a,n){var i=createJsonHandler(a,n);this.sendRequest("POST",t,e,i,n)},Utils.prototype.createXHR=function(){return window.XDomainRequest?new window.XDomainRequest:new XMLHttpRequest},Utils.prototype.sendRequest=function(t,e,a,n,i){var o;window.XDomainRequest?((o=new window.XDomainRequest).onload=function(){n(o.responseText,null)},o.onerror=function(){i()},o.ontimeout=function(){i()}):(o=new XMLHttpRequest).onreadystatechange=function(){if(o.readyState===XMLHttpRequest.DONE)if(200===this.status||304===this.status){for(var t={},e=o.getAllResponseHeaders().split("\r\n"),a=0;a<e.length;a++)if(""!==e[a]){var r=e[a].split(": ");t[r[0]]=r[1]}n(o.responseText,t)}else i(o)},o.open(t,e,!0),a?"object"==typeof a?o.send(this.toJSON(a)):o.send(a):o.send()},Utils.prototype.trimString=function(t){return t.trim&&void 0===removesZeroWidthByTrim&&(removesZeroWidthByTrim=0==="​".trim().length),t.trim&&!1===removesZeroWidthByTrim?t.trim():t.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,"")},Utils.prototype.to_set=function(t){for(var e={},a=0;a<t.length;a++)e[t[a]]=!0;return e},Utils.prototype.isEmpty=function(t){return this.normalizeText(t)===wovnEmptyCharacter},Utils.prototype.toJSON=function(t,e,a){return this.loadsJsonBreakingPrototype()?Object.toJSON(t):this.loadsJsonBreakingMooTools()&&void 0!==JSON.encode?JSON.encode(t):JSON.stringify(t,e,a)},Utils.prototype.loadsJsonBreakingPrototype=function(){return void 0!==window.Prototype&&'["a"]'!==JSON.stringify(["a"])},Utils.prototype.loadsJsonBreakingMooTools=function(){return void 0!==window.MooTools&&'["a"]'!==JSON.stringify(["a"])},Utils.prototype.pushUnique=function(t,e){for(var a=0;a<t.length;a++)if(e==t[a])return;t.push(e)},Utils.prototype.findIndex=function(t,e,a){a=a||function(t,e){return t==e};for(var n=0;n<t.length;n++)if(a(t[n],e))return n;return-1},Utils.prototype.setComplement=function(t,e,a){a=a||function(t,e){return t==e};var n=[];for(var i in t)t.hasOwnProperty(i)&&-1===this.findIndex(e,t[i],a)&&n.push(t[i]);return n},Utils.prototype.getBrowserFingerprint=function(){if(browserFingerprint)return browserFingerprint;var t=window.navigator,e=t.vendor,a=t.userAgent,n=t.hardwareConcurrency,i=t.language,o=t.languages,r=(t.plugins,e||"None"),s=a||"None",u=n||"None",l=i||"None",d=o||[],c=window.screen||{height:"None",width:"None",colorDepth:"None",pixelDepth:"None"},h=r+"::"+s+"::"+u+"::"+l+"::"+d.join()+"::"+function(){for(var t=window.navigator.plugins,e=[],a=0;a<t.length;++a){var n=t[a];e.push(n.name+"-"+n.description+"-"+n.filename)}return e}().join()+"::"+c.height+"::"+c.width+"::"+c.colorDepth+"::"+c.pixelDepth+"::"+(new Date).getTimezoneOffset();return browserFingerprint=md5(h)},Utils.prototype.clearCache=function(){this.normalizeTextCache={},this.normalizeTextCacheWithoutZeroWidthSpace={}},Utils.prototype.normalizeText=function(t,e){if(void 0===e&&(e=!1),null==t)return null;if(this.normalizeTextCache[t]){var a=this.normalizeTextCache[t];return e&&a===wovnEmptyCharacter?a="":e||""!==a||(a=wovnEmptyCharacter),a}var n=trimText(t,/[\n \t\u0020\u0009\u000C\u200B\u000D\u000A]+/g);return!1===e&&0===n.length&&(n=wovnEmptyCharacter),this.normalizeTextCache[t]=n,n},Utils.prototype.normalizeTextWithoutZeroWidthSpace=function(t){if(null==t)return null;if(this.normalizeTextCacheWithoutZeroWidthSpace[t])return this.normalizeTextCacheWithoutZeroWidthSpace[t];var e=trimText(t,/[\n \t\u0020\u0009\u000C\u000D\u000A]+/g);return this.normalizeTextCacheWithoutZeroWidthSpace[t]=e,e},Utils.prototype.decodeHTMLEntities=function(t){return t.replace(/&#(\d+);/g,function(t,e){return String.fromCharCode(e)})},Utils.prototype.extractPath=function(t){var e=t.replace(/^.*?\/\/[^\/]+/,"");return""===e?"/":e},Utils.prototype.toArrayFromDomList=function(t){for(var e=[],a=0;a<t.length;a++)e.push(t[a]);return e},Utils.prototype.keys=function(t){if(Object.keys)return Object.keys(t);var e=[];for(var a in t)t.hasOwnProperty(a)&&e.push(a);return e},Utils.prototype.values=function(t){for(var e=this.keys(t),a=[],n=0;n<e.length;n++)a.push(t[e[n]]);return a},Utils.prototype.each=function(t,e){for(var a=this.keys(t),n=0;n<a.length;n++){var i=a[n];e(i,t[i])}},Utils.prototype.includes=function(t,e){for(var a=0;a<t.length;a++)if(t[a]===e)return!0;return!1},Utils.prototype.indexOf=function(t,e,a){if(void 0===a&&(a=0),t.indexOf)return t.indexOf(e);var n=t.length>>>0;if(0===n)return-1;if(1/0===Math.abs(a)&&(a=0),a>=n)return-1;for(a=Math.max(0<=a?a:n-Math.abs(a),0);a<n;a++)if(a in t&&t[a]===e)return a;return-1},Utils.prototype.parseJSON=function(jsonText,reviver){if(JSON&&JSON.parse)return JSON.parse(jsonText);var s=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;s.lastIndex=0,s.test(jsonText)&&(jsonText=jsonText.replace(s,function(t){return"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)}));var replace=jsonText.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,"@"),replace2=replace.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,"]"),s2=replace2.replace(/(?:^|:|,)(?:\s*\[)+/g,"");if(/^[\],:{}\s]*$/.test(s2)){var d=eval("("+jsonText+")");return"function"==typeof reviver?jsonReviver({"":d},"",reviver):d}throw new SyntaxError("JSON.parse")},Utils.prototype.isValidURI=function(t){try{return decodeURIComponent(t),!0}catch(t){if("URIError"===t.name)return!1}},Utils.prototype.assign=function(t,e){return Object.assign?Object.assign(t,e):(Object.keys(e).forEach(function(a){t[a]=e[a]}),t)},Utils.prototype.destroy=function(){for(var t=0;t<addedEvents.length;t++){var e=addedEvents[t];this.removeHandler(e[0],e[1],e[2])}},Utils.prototype.convertCssStyles=function(t){if(!Constant_1.default.IS_DEV)return t;var e,a,n=Widget_1.default.c("RailsBridge").domainCssStyles,i={};if(Object.keys(t).forEach(function(o){var r=t[o];"style"===o?e=r.toString().split(" "):"position"===o?a=r.toString():n[o]&&n[o][r.toString()]&&(i[o]=n[o][r.toString()])}),e&&n.style[e[0]]){var o=n.style[e[0]];i.style=o.form,2==e.length&&o.colors[e[1]]&&(i.style+=o.colors[e[1]]),i.position=o.position[a]}return t.css=i,t},Utils}();exports.default=new Utils},function(t,e){t.exports=function(t){return t.webpackPolyfill||(t.deprecate=function(){},t.paths=[],t.children||(t.children=[]),Object.defineProperty(t,"loaded",{enumerable:!0,get:function(){return t.l}}),Object.defineProperty(t,"id",{enumerable:!0,get:function(){return t.i}}),t.webpackPolyfill=1),t}},,,function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(52),i=void 0,o={widgetOptions:{},published_langs:[],convert_langs:[]},r={},s=function(){function t(){}return t.prototype.getValue=function(t){return o[t]||(this.getOptions()||{})[t]},t.prototype.set=function(t){o=t},t.prototype.setSavedData=function(t){r=t},t.prototype.getSavedData=function(){return r},t.prototype.getValuesInfo=function(){return o.values_info||{}},t.prototype.getProTranslatingValues=function(){return o.pro_translating||{}},t.prototype.get=function(){return o},t.prototype.getLang=function(){return o.language},t.prototype.getPageCss=function(){return o.page_css},t.prototype.getPageJs=function(){return o.page_js},t.prototype.getSecondaryLang=function(){return this.getOptions().secondary_language},t.prototype.getPageId=function(){return o.id},t.prototype.getManualPublishedDate=function(){var t=o.manual_published_time;return t?new Date(1e3*t):null},t.prototype.getTranslationData=function(){var t=this.getTextValues(),e=this.getImageValues(),a=this.getHTMLTextValues();return new n.default(Date.now(),t,e,a)},t.prototype.getTextValues=function(){return o.text_vals||{}},t.prototype.getHTMLTextValues=function(){return o.html_text_vals||{}},t.prototype.getImageValues=function(){return o.img_vals||{}},t.prototype.getLinkTranslations=function(){return o.link_translations||{}},t.prototype.getRemovedTextValues=function(){return o.removed_text_vals||[]},t.prototype.getRemovedTextValuesHash=function(){return o.removed_text_vals_hash||{}},t.prototype.getUntranslatedValues=function(){return o.untranslated_values||{}},t.prototype.getPublishedLangs=function(){return o.published_langs||[]},t.prototype.hasPublishedLang=function(){return this.getPublishedLangs().length>0},t.prototype.isExceedMachineTranslationLimit=function(){return this.getValue("is_exceed_machine_translation_limit")||!1},t.prototype.getDomainLangs=function(){return this.getValue("domain_langs")||[]},t.prototype.getConvertedLangs=function(){var t=o.convert_langs||[],e=this.getDomainLangs();return 0===e.length?t:t.reduce(function(t,a){return e.indexOf(a.code)>-1&&t.push(a),t},[])},t.prototype.isTranslatableLangs=function(t){return this.getTranslatableLangs().indexOf(t)>-1},t.prototype.getTranslatableLangs=function(){return this.getPublishedLangs().concat(this.getLang())},t.prototype.getAutoTranslateLangs=function(){return this.getOptions().auto_translate_langs||o.auto_translate_langs},t.prototype.getAutoPublishLangs=function(){return this.getOptions().auto_publish_langs||o.auto_translate_langs},t.prototype.getOptions=function(){return o.widgetOptions},t.prototype.setOptions=function(t){o.widgetOptions=t},t.prototype.updateOptions=function(t){for(var e in o.widgetOptions||(o.widgetOptions={}),t)t.hasOwnProperty(e)&&(o.widgetOptions[e]=t[e])},t.prototype.hasEmptyOriginalOptions=function(){if(!o.widgetOptions||"{}"==JSON.stringify(o.widgetOptions))return!0;var t=[];for(var e in o.widgetOptions)o.widgetOptions.hasOwnProperty(e)&&t.push(e);return["countryCode"].sort().toString()==t.sort().toString()},t.prototype.getStyleColor=function(){var t=this.getValue("style");if(!t)return null;var e=t.split(" ");return e.length<2?null:e[1]},t.prototype.needsCountryCode=function(t){return t.useCountryData||!1},t.prototype.getCountryCode=function(){if(o.widgetOptions)return this.getOptions().countryCode},t.prototype.browsesFromJapan=function(){return!!o.widgetOptions&&"JP"===this.getOptions().countryCode},t.prototype.setCountryCode=function(t){o.widgetOptions||(o.widgetOptions={}),o.widgetOptions.countryCode=t},t.prototype.dynamicValues=function(){return this.getValue("dynamic_values")||!1},t.prototype.getIgnoredClasses=function(){return this.getValue("ignored_classes")||[]},t.prototype.getIgnoredSelectors=function(){return this.getValue("ignored_selectors")||[]},t.prototype.getIgnoredPatterns=function(){return{classes:this.getIgnoredClasses(),selectors:this.getIgnoredSelectors()}},t.prototype.getExcludedPaths=function(){return this.getValue("excluded_paths")||[]},t.prototype.getExcludedUrls=function(){return this.getValue("excluded_urls")||[]},t.prototype.useWidgetManualStartFeature=function(){return this.getValue("widget_manual_start")||!1},t.prototype.useMachineTranslatedModal=function(){return this.getValue("show_machine_translated_modal")||!1},t.prototype.getMachineTranslatedModalContent=function(){return this.getValue("machine_translated_modal_content")||{}},t.prototype.reportLotRatio=function(){var t=this.getOptions().report_lot_ratio;return t||0===t||(t=1),t},t.prototype.dynamicLoading=function(){return this.getValue("dynamic_loading")||!1},t.prototype.useUnifiedValue=function(){return o.widgetOptions.unified_values},t.prototype.useUnifiedValuesMigrating=function(){return o.widgetOptions.unified_values_migrating},t.prototype.useAriaLabel=function(){return o.widgetOptions.aria_label},t.prototype.useFragmentedValue=function(){return o.widgetOptions.scraping2},t.prototype.useFuzzyMatch=function(){return this.getOptions().fuzzy_match||o.fuzzy_match},t.prototype.numberSwappingAllowed=function(){return o.widgetOptions.number_swapping||!1},t.prototype.useImmediateWidget=function(){return!0===this.getOptions().immediate_widget},t.prototype.hasWidgetSessionFeature=function(){return!0===this.getOptions().widget_session},t.prototype.hasDomainPrecacheFeature=function(){return 1==this.getOptions().domain_precache},t.prototype.hasOnDemandTranslationFeature=function(){return 1==this.getOptions().on_demand_translation},t.prototype.hasUnifiedValuePreviewFeature=function(){return o.has_unified_values_preview||!1},t.prototype.hasFastReportNewPagesFeature=function(){return!!this.getOptions().fast_report_new_pages},t.prototype.hasSpaStopClearingWidgetLanguages=function(){return!!this.getOptions().spa_stop_clearing_widget_languages},t.prototype.hasIgnoreBrowserLang=function(){return this.getOptions().ignore_browser_lang},t.prototype.hasNoAutomaticRedirection=function(){return this.getOptions().no_automatic_redirection},t.prototype.hasRuleBaseTranslation=function(){return this.getOptions().rule_base_translation},t.prototype.couldUseGlossaryAddFeature=function(){return!!this.getValue("tp_glossary_terms")},t.prototype.createNormalizedHostAliases=function(){if(i)return i;for(var t=this.getOptions().host_aliases||[],e=0;e<t.length;e++)t[e]=t[e].replace(/^\^/,"").replace(/\$$/,"").replace(/\\([^\\])/g,"$1");return i=t,t},t.prototype.clear=function(){i=void 0},t}();e.default=new s},,function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(t,e,a){void 0===a&&(a=[]),this.name=t,this.regexpString=e,this.captureNames=a,this.regexp=new RegExp("^"+e)};e.Marker=n;var i=function(t,e,a,n,i){this.name=t,this.mark=e,this.index=a,this.captures=n,this.captureIndexes=i};e.Match=i;var o=function(t,e,a,n){this.matched=t,this.index=e,this.matches=a,this.remaining=n};e.RuleResult=o;var r=function(t,e){this.translation=t,this.remaining=e};e.MatchResult=r;var s=function(){function t(){}return t.prototype.translate=function(t,e){for(var a=e.matches,n=this.templates[t],i=function(e){var i=a[e],r=o.translateMatchedText(i,t);if(void 0!==r){var s=r.replace(/\\\d/g,function(t){return i.captures[t.slice(1)]}),u=o.findReplaceMarker(i);n=n.replace(u,s)}},o=this,r=0;r<a.length;++r)i(r);return n},t.prototype.findReplaceMarker=function(t){throw"Not yet implemented"},t.prototype.translateMatchedText=function(t,e){throw"Not yet implemented"},t}();e.AbstractRuleBaseTranslation=s},,function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.prototype.find=function(t,e,a){for(var n=0;n<t.length;++n){var i=t[n];if(e.call(a,i,n,t))return i}},t.prototype.flatten=function(t){var e=this;return t.reduce(function(t,a){return Array.isArray(a)?t.concat(e.flatten(a)):t.concat(a)},[])},t}();e.default=new n},,,,,,,,,,,,,,,,,,,,function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=void 0,i=window.navigator.userAgent,o=function(){function t(){this.isIEResult=void 0,this.isEdgeResult=void 0}return t.prototype.setAgentString=function(t){i=t},t.prototype.getAgentString=function(){return i},t.prototype.isIE=function(){if(void 0!==this.isIEResult)return this.isIEResult;var t=i.toLowerCase();return this.isIEResult=-1!==t.indexOf("msie")||-1!==t.indexOf("trident"),this.isIEResult},t.prototype.isEdge=function(){return void 0!==this.isEdgeResult?this.isEdgeResult:(this.isEdgeResult=!!i.match(/Edge/),this.isEdgeResult)},t.prototype.isCrawler=function(){return new RegExp("googlebot|slurp|y!j|yahooseeker|bingbot|msnbot|baiduspider|yandex|yeti|naverbot|duckduckbot|360spider|^sogou","i").test(i)},t.prototype.isWovnCrawler=function(){return new RegExp("WovnCrawler","i").test(i)},t.prototype.isMobile=function(){return!!(i.match(/android/i)&&i.match(/mobile/i)||i.match(/iphone/i)||i.match(/ipod/i)||i.match(/phone/i)||(i.match(/blackberry/i)||i.match(/bb10/i)||i.match(/rim/i))&&!i.match(/tablet/i)||(i.match(/\(mobile;/i)||i.match(/\(tablet;/i)||i.match(/; rv:/i))&&i.match(/mobile/i)||i.match(/meego/i))},t.prototype.mutatesTextNodeData=function(){if(void 0!==n)return n;var t=document.createElement("p");return t.innerHTML="0\n1",n="0\n1"!==t.firstChild.data},t.prototype.canStoreObjectInNode=function(){return!this.isEdge()&&!this.isIE()},t.prototype.isDataHighlighter=function(){return!!i.match(/Google PP Default/)},t}();e.default=new o},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.prototype.set=function(t,e,a,n){if(void 0===a&&(a=0),""!==t){n=void 0===n?location.hostname||"http://j.wovn.io/wovn.io":n;var i=t+"="+(null===e?"":e)+"; path=/";if(a){var o=new Date;o.setTime(o.getTime()+24*a*60*60*1e3),i+="; expires="+o.toUTCString()}var r=null,s=function(t){r=i+(t?"; domain="+t:""),document.cookie=r};if(1===n.split(".").length)s();else{var u=n.split(".");u.shift();var l="."+u.join(".");s(l),null!=this.get(t)&&this.get(t)==e||(s(l="."+n),null!=this.get(t)&&this.get(t)==e||s(n))}return r}},t.prototype.get=function(t){for(var e=t+"=",a=document.cookie.split(";"),n=0;n<a.length;n++){for(var i=a[n];" "==i.charAt(0);)i=i.substring(1,i.length);if(0==i.indexOf(e))return i.substring(e.length,i.length)}return null},t.prototype.erase=function(t){this.set(t,null,-1),this.set(t,null,-1,"")},t}();e.default=new n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(0),i=function(){function t(){}return t.prototype.translate=function(t,e,a,i){var o=this.buildUrl(t);n.default.c("Utils").sendRequest("GET",o+"&src="+encodeURIComponent(e),null,function(t,e){return a(JSON.parse(t),e)},i)},t.prototype.buildUrl=function(t){var e=n.default.c("RailsBridge").requestWidgetHost;return e+="/v0/instant_translate",e+="?token="+n.default.tag.getAttribute("key"),(e+="&tgt_lang="+encodeURIComponent(t))+"&unified=true"},t}();e.default=i},,,,,,,,,,,,,,function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n="function"==typeof Symbol&&"symbol"==typeof Symbol.iterator?function(t){return typeof t}:function(t){return t&&"function"==typeof Symbol&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t};e.isElement=function(t){return"object"===("undefined"==typeof HTMLElement?"undefined":n(HTMLElement))?t instanceof HTMLElement:!!t&&"object"===(void 0===t?"undefined":n(t))&&1===t.nodeType&&"string"==typeof t.nodeName}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(11),i=a(7),o=a(15),r=a(54),s=function(){function t(t,e,a,n){void 0===t&&(t=null),void 0===e&&(e={}),void 0===a&&(a={}),void 0===n&&(n={}),this.creationTime=t,this.textVals=e,this.imgVals=a,this.htmlTextVals=n}return t.create=function(e,a,n,i){return new t(e,a,n,i)},t.onlyShowLangs=function(t){var e=this.loadFromStoreWithoutFilter();this.localTranslationData=this.create(e.creationTime,this.filterByLangs(t,e.textVals),this.filterByLangs(t,e.imgVals),this.filterByLangs(t,e.htmlTextVals))},t.loadFromStore=function(){return this.localTranslationData||this.loadFromStoreWithoutFilter()},t.loadFromStoreWithoutFilter=function(){var e=Date.now()-36e5,a=n.default.getManualPublishedDate(),i=a?a.getTime():e;return i<e&&(i=e),t.getStoredTranslationValue(i)},t.getStoredTranslationValue=function(e){var a=r.WovnStorageInstance.get();return a&&t.getStoredTranslation(a,e)||new t(Date.now(),{},{},{})},t.getStoredTranslation=function(e,a){var n=e.getValue("TranslationStore",a);if(!n)return null;var i=n[0],o=n[1];return new t(i,o.text_vals||{},o.img_vals||{},o.html_text_vals||{})},t.clearData=function(){new t(1,{},{},{}).storeToStorage()},t.prototype.storeToStorage=function(){var t=r.WovnStorageInstance.get();if(t){var e={text_vals:this.textVals,img_vals:this.imgVals,html_text_vals:this.htmlTextVals};t.setValue("TranslationStore",e,this.creationTime)}},t.prototype.update=function(t){var e=this,a=t.textVals,n=t.imgVals,o=t.htmlTextVals;i.default.each(a,function(t,a){e.textVals[t]=a}),i.default.each(n,function(t,a){e.imgVals[t]=a}),i.default.each(o,function(t,a){e.htmlTextVals[t]=a}),t.creationTime<this.creationTime&&(this.creationTime=t.creationTime)},t.prototype.calcImgValsForIndex=function(t){void 0===t&&(t=null);for(var e=t||this.imgVals,a=/https?:\/\/([^\/:]+)(:[0-9]+)?/,o={},r=i.default.assign,s=n.default.createNormalizedHostAliases(),u={},l=s.length,d=0;d<l;d++)(c=s[d]).indexOf(":")>=0&&(c=c.substring(0,c.indexOf(":"))),u[c]=!0;for(d=0;d<l;d++){var c,h=(c=s[d]).indexOf(":")>=0?c:c+"$2";for(var p in e)if(e.hasOwnProperty(p)){var m=p.match(a);if(m&&!u[m[1]]){o[p]=r({},e[p]);continue}for(var g=e[p],f=p.replace(a,h),S=p.replace(a,c),y=["http://"+f,"https://"+f,"http://"+S,"https://"+S],v=0;v<y.length;v++)o[y[v]]=this.getValue(r,y[v],e,g)}}return o},t.prototype.getValue=function(t,e,a,n){return a[e]?t({},a[e]):t({},n)},t.prototype.getTextValuesByLangs=function(t){function e(e){var a=Object.keys(e).map(function(a){return function(e){return Object.keys(e).filter(function(e){return t.indexOf(e)>-1}).map(function(t){return e[t]})}(e[a])});return o.default.flatten(a).map(function(t){return t.data})}return e(this.textVals).concat(e(this.htmlTextVals))},t.filterByLangs=function(t,e){var a={};for(var n in e){var i=e[n],o={};Object.keys(i).filter(function(e){return-1!=t.indexOf(e)}).forEach(function(t){o[t]=i[t]}),Object.keys(o).length>0&&(a[n]=o)}return a},t}();e.default=s},function(t,e){var a={utf8:{stringToBytes:function(t){return a.bin.stringToBytes(unescape(encodeURIComponent(t)))},bytesToString:function(t){return decodeURIComponent(escape(a.bin.bytesToString(t)))}},bin:{stringToBytes:function(t){for(var e=[],a=0;a<t.length;a++)e.push(255&t.charCodeAt(a));return e},bytesToString:function(t){for(var e=[],a=0;a<t.length;a++)e.push(String.fromCharCode(t[a]));return e.join("")}}};t.exports=a},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(7),i="__wovn__.",o=void 0;function r(t){return i+t}var s=function(){function t(){this.storage=function(){try{if(window.localStorage)return window.localStorage}catch(t){return null}return null}()}return t.prototype.get=function(e){return void 0===e&&(e=!1),o&&!e||(o=new t),o.storage?o:null},t.prototype.usable=function(){return!!this.storage},t.prototype.getValue=function(t,e){if(!this.usable())return null;var a=r(t),n=this.getItem(a);if(!n)return null;var i=null;try{i=JSON.parse(n)}catch(t){return this.removeItem(a),null}var o=i.creationTime,s=i.value;return o&&s?o<e||(new Date).getTime()<o?(this.removeItem(a),null):[o,s]:(this.removeItem(a),null)},t.prototype.setValue=function(t,e,a){if(this.usable()){var i={creationTime:a,value:e};this.setItem(r(t),n.default.toJSON(i))}},t.prototype.getItem=function(t){try{return this.storage.getItem(t)}catch(t){return null}},t.prototype.setItem=function(t,e){try{this.storage.setItem(t,e)}catch(e){this.removeItem(t)}},t.prototype.removeItem=function(t){try{this.storage.removeItem(t)}catch(t){}},t}();e.WovnStorage=s,e.WovnStorageInstance=new s},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(36),i="wovn_selected_lang",o="wovn_selected_lang_set_time";function r(){n.default.set(o,(new Date).getTime(),365)}var s=function(){function t(){}return t.prototype.set=function(t){r(),n.default.set(i,t,365)},t.prototype.get=function(){return(t=n.default.get("wovn_selected_lang_2017v1"))&&(n.default.erase("wovn_selected_lang_2017v1"),function(t){r(),n.default.set(i,t,365)}(t)),function(){var t=n.default.get(o);return!t||parseInt(t)<1519376747522}()?null:n.default.get(i);var t},t.prototype.erase=function(){n.default.erase(i)},t}();e.default=new s},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=["alt","value","placeholder","data-confirm","data-disable-with","content","label","title"],i=function(){function t(t){this.node=t,this.nodeName=t.nodeName,this.data=t.data}return t.prototype.create=function(e){return new t(e)},t.prototype.getUpperNodeName=function(){if(!this.nodeName)return null;var t=this.nodeName.charCodeAt(1);return 0==(65<=t&&t<=90)?this.nodeName.toUpperCase():this.nodeName},t.prototype.replaceData=function(t,e){this.node.data=t,this.data=t,this.node.actualLang=e},t.prototype.refreshData=function(){var t=this.node.data;t!==this.data&&(this.data=t)},t.prototype.isValueNode=function(){return-1!==n.indexOf(this.nodeName)},t}();e.default=i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(t,e,a){this.label=t,this.node=e,this.isClose=a};e.default=n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(11),i=a(0),o=function(){function t(){this.tagCaches={}}return t.prototype.getAttributeUsingCache=function(t){return this.tagCaches.hasOwnProperty(t)||(this.tagCaches[t]=i.default.tag.getAttribute(t)),this.tagCaches[t]},t.prototype.urlPattern=function(t){var e;if(i.default.tag.getAttribute("urlPattern"))e=i.default.tag.getAttribute("urlPattern");else if(n.default.getOptions().lang_path)switch(n.default.getOptions().lang_path){case"query":e="query";break;case"path":e="path"}return 0===arguments.length?e:e===t},t.prototype.backend=function(t){var e;return e=!!i.default.tag.getAttribute("backend"),0===arguments.length?e:e===!!t},t.prototype.getSitePrefixPath=function(){return this.getAttributeUsingCache("site_prefix_path")},t.prototype.setConfig=function(t,e){return"setConfig"===t?null:(this[t]=e,e)},t}();e.default=new o},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(56),i="wovn-src:";function o(t){return"#comment"===t.nodeName&&function(t,e){if(t.startsWith)return t.startsWith(e);for(var a=0;a<e.length;a++)if(t.charCodeAt(a)!==e.charCodeAt(a))return!1;return!0}(t.data,i)}var r=function(){function t(){}return t.prototype.isLegitimateNode=function(t){return"#text"!==t.nodeName||!function(t){var e=t.previousSibling;if(e){if("#text"===e.nodeName)return!0;if(o(e)){var a=e.previousSibling;if(a&&"#text"===a.nodeName)return!0}}var n=t.nextSibling;if(n){if("#text"===n.nodeName)return!0;if(o(n)){var i=n.nextSibling;if(i&&"#text"===i.nodeName)return!0}}return!1}(t.node)},t.prototype.isFirstTextNode=function(t){for(var e=t;e;){var a=e.previousSibling;if(!a)return!0;if("#text"===a.nodeName){if(!1===/^\s*$/.test(a.data))return!1}else if(0==o(a))return!0;e=a}},t.prototype.disableIllegitimateNode=function(t){if("#text"===t.nodeName)for(var e=t.node.nextSibling;e;){var a=new n.default(e),i=e.nextSibling;if("#text"===a.nodeName)""!==a.data&&a.replaceData("",null);else{if(!o(a))break;e.parentNode.removeChild(e)}e=i}},t.prototype.wholeText=function(t){var e=t.wholeText;if(!e){e="";for(var a=t;a&&"#text"===a.nodeName;)e+=a.data,a=a.nextSibling}return e},t.prototype.getXpath=function(t){var e=[],a=t;for("#text"===t.nodeName&&(e.push("text()"),a=a.parentElement);a&&a.nodeType===Node.ELEMENT_NODE;a=a.parentElement){for(var n=0,i=!1,o=a.previousSibling;o;o=o.previousSibling)o.nodeType!=Node.DOCUMENT_TYPE_NODE&&o.nodeName===a.nodeName&&n++;for(o=a.nextSibling;o&&!i;o=o.nextSibling)o.nodeName===a.nodeName&&(i=!0);var r=a.nodeName.toLowerCase(),s=n||i?"["+(n+1)+"]":"";e.splice(0,0,r+s)}return e.length?"/"+e.join("/"):null},t}();e.default=new r},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(0),i=a(11),o=a(7),r=function(){function t(){this.WOD_CONTAINER="wovn-on-demand",this.WOD_TRIGGER="wovn-on-demand-trigger",this.WOD_SOURCE="wovn-on-demand-source",this.WOD_RESULT="wovn-on-demand-result"}return t.prototype.isOdtIgnoreNode=function(t){return"function"==typeof t.getAttribute&&(t.hasAttribute(this.WOD_RESULT)||t.hasAttribute(this.WOD_SOURCE))},t.prototype.bindOdtClickEvent=function(t){if(i.default.hasOnDemandTranslationFeature()){if(!this.isValidOdtElement(t))return!1;t.querySelector("["+this.WOD_TRIGGER+"]").onclick=this.onTriggerClick.bind(this)}},t.prototype.isValidOdtElement=function(t){return!("function"!=typeof t.hasAttribute||!t.hasAttribute(this.WOD_CONTAINER))&&0!==t.querySelectorAll("["+this.WOD_SOURCE+"]").length&&0!==t.querySelectorAll("["+this.WOD_TRIGGER+"]").length&&0!==t.querySelectorAll("["+this.WOD_RESULT+"]").length},t.prototype.onTriggerClick=function(t){var e=this;t.stopPropagation(),t.preventDefault(),t.target.setAttribute("disabled",!0);var a=this.getOdtContainer(t.target);if(a){var i=a.querySelector("["+this.WOD_SOURCE+"]"),o=n.default.c("Lang").getActualLang();this.translateNode(i,o,function(n){e.insertTranslationResult(a,n),t.target.removeAttribute("disabled")},function(){t.target.removeAttribute("disabled")})}},t.prototype.getOdtContainer=function(t){for(var e=t.parentElement;e;){if(e.hasAttribute(this.WOD_CONTAINER))return e;e=e.parentElement}},t.prototype.getOdtResultNode=function(t){var e=t.querySelector("["+this.WOD_RESULT+"]");return e.setAttribute("style",""),e},t.prototype.insertTranslationResult=function(t,e){var a=this.getOdtResultNode(t);a.innerHTML=e[0].dst,a.focus()},t.prototype.clearOdtResults=function(){for(var t=document.querySelectorAll("["+this.WOD_RESULT+"]"),e=0;e<t.length;e++){var a=t[e];a.innerHTML="",a.setAttribute("style","display: none")}},t.prototype.translateNode=function(t,e,a,n){if(i.default.hasOnDemandTranslationFeature()){var o=[t.innerHTML.replace(/(<\w+)(\s+?)[^>]*/g,"$1")];this.translateTexts(o,e,a,n)}},t.prototype.translateTexts=function(t,e,a,i){var r={token:n.default.tag.getAttribute("key"),tgt_lang:e,texts:t};if(r.token&&r.tgt_lang&&t&&t.length>0){var s=n.default.c("RailsBridge").wovnHost.replace(/^.*\/\//,"//api."),u=o.default.createXHR(),l="on_demand_translation="+encodeURIComponent(o.default.toJSON(r));u.open("POST",s+"v0/on_demand_translation",!0),u.setRequestHeader("Content-Type","application/x-www-form-urlencoded"),u.onreadystatechange=function(){if(4===u.readyState)if(200===u.status){var t=JSON.parse(u.responseText);a(t.translations)}else i(new Error("Cannot translate text"))},u.send(l)}},t}();e.default=new r},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.prototype.contains=function(t,e){return-1!=t.indexOf(e)},t.prototype.startsWith=function(t,e,a){return a=a||0,t.substr(a,e.length)===e},t}();e.default=new n},,,,,,,,,,,,,,,,,,,,,,,function(t,e,a){t.exports=a(85)},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(86),i=a(87),o=a(2),r=a(96),s=a(101),u=a(56),l=a(102),d=a(104),c=a(106),h=a(108),p=a(110),m=a(35),g=a(58),f=a(36),S=a(111),y=a(11),v=a(112),k=a(114),b=a(55),w=a(59),T=a(60),O=a(118),_=a(119),x=a(120),L=a(121),M=a(122),N=a(123),j=a(7),C=a(126),I=a(61),K=a(54),A=a(127),E=a(37),R=a(136);document.WOVNIO.components.PunyCode=n,document.WOVNIO.components.uniqueSelector=i,document.WOVNIO.components.NodeContainer=u.default,document.WOVNIO.components.Agent=m.default,document.WOVNIO.components.Config=g.default,document.WOVNIO.components.Constant=o.default,document.WOVNIO.components.Cookie=f.default,document.WOVNIO.components.TagCustomization=S.default,document.WOVNIO.components.Data=y.default,document.WOVNIO.components.DomIterator=v.default,document.WOVNIO.components.FuzzyMatch=k.default,document.WOVNIO.components.Lang=r.default,document.WOVNIO.components.CustomDomainLanguages=s.default,document.WOVNIO.components.LangCookie=b.default,document.WOVNIO.components.Node=w.default,document.WOVNIO.components.OnDemandTranslator=T.default,document.WOVNIO.components.InSiteSearcher=O.default,document.WOVNIO.components.PageChecker=_.default,document.WOVNIO.components.Parser=x.default,document.WOVNIO.components.PerformanceMonitor=L.default,document.WOVNIO.components.SingleWorker=M.default,document.WOVNIO.components.Storage=K.WovnStorageInstance,document.WOVNIO.components.TagElementBridge=h.default,document.WOVNIO.components.TranslationDataBridge=p.default,document.WOVNIO.components.UnifiedValueTagFragmentBridge=l.default,document.WOVNIO.components.UnifiedValueTextFragmentBridge=d.default,document.WOVNIO.components.UrlFormatter=N.default,document.WOVNIO.components.Utils=j.default,document.WOVNIO.components.StringUtils=I.default,document.WOVNIO.components.ValuesStackBridge=c.default,document.WOVNIO.components.SessionProxy=C.default,document.WOVNIO.components.RuleBaseTranslation=new A.RuleBaseTranslation,document.WOVNIO.components.InstantTranslation=E.default,document.WOVNIO.components.Wap=R.default},function(t,e,a){(function(t,n){var i;/*! https://mths.be/punycode v1.4.1 by @mathias */!function(o){e&&e.nodeType,t&&t.nodeType;var r="object"==typeof n&&n;r.global!==r&&r.window!==r&&r.self;var s,u=2147483647,l=36,d=1,c=26,h=38,p=700,m=72,g=128,f="-",S=/^xn--/,y=/[^\x20-\x7E]/,v=/[\x2E\u3002\uFF0E\uFF61]/g,k={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},b=l-d,w=Math.floor,T=String.fromCharCode;function O(t){throw new RangeError(k[t])}function _(t,e){for(var a=t.length,n=[];a--;)n[a]=e(t[a]);return n}function x(t,e){var a=t.split("@"),n="";return a.length>1&&(n=a[0]+"@",t=a[1]),n+_((t=t.replace(v,".")).split("."),e).join(".")}function L(t){for(var e,a,n=[],i=0,o=t.length;i<o;)(e=t.charCodeAt(i++))>=55296&&e<=56319&&i<o?56320==(64512&(a=t.charCodeAt(i++)))?n.push(((1023&e)<<10)+(1023&a)+65536):(n.push(e),i--):n.push(e);return n}function M(t){return _(t,function(t){var e="";return t>65535&&(e+=T((t-=65536)>>>10&1023|55296),t=56320|1023&t),e+T(t)}).join("")}function N(t){return t-48<10?t-22:t-65<26?t-65:t-97<26?t-97:l}function j(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function C(t,e,a){var n=0;for(t=a?w(t/p):t>>1,t+=w(t/e);t>b*c>>1;n+=l)t=w(t/b);return w(n+(b+1)*t/(t+h))}function I(t){var e,a,n,i,o,r,s,h,p,S,y=[],v=t.length,k=0,b=g,T=m;for((a=t.lastIndexOf(f))<0&&(a=0),n=0;n<a;++n)t.charCodeAt(n)>=128&&O("not-basic"),y.push(t.charCodeAt(n));for(i=a>0?a+1:0;i<v;){for(o=k,r=1,s=l;i>=v&&O("invalid-input"),((h=N(t.charCodeAt(i++)))>=l||h>w((u-k)/r))&&O("overflow"),k+=h*r,!(h<(p=s<=T?d:s>=T+c?c:s-T));s+=l)r>w(u/(S=l-p))&&O("overflow"),r*=S;T=C(k-o,e=y.length+1,0==o),w(k/e)>u-b&&O("overflow"),b+=w(k/e),k%=e,y.splice(k++,0,b)}return M(y)}function K(t){var e,a,n,i,o,r,s,h,p,S,y,v,k,b,_,x=[];for(v=(t=L(t)).length,e=g,a=0,o=m,r=0;r<v;++r)(y=t[r])<128&&x.push(T(y));for(n=i=x.length,i&&x.push(f);n<v;){for(s=u,r=0;r<v;++r)(y=t[r])>=e&&y<s&&(s=y);for(s-e>w((u-a)/(k=n+1))&&O("overflow"),a+=(s-e)*k,e=s,r=0;r<v;++r)if((y=t[r])<e&&++a>u&&O("overflow"),y==e){for(h=a,p=l;!(h<(S=p<=o?d:p>=o+c?c:p-o));p+=l)_=h-S,b=l-S,x.push(T(j(S+_%b,0))),h=w(_/b);x.push(T(j(h,0))),o=C(a,k,n==i),a=0,++n}++a,++e}return x.join("")}s={version:"1.4.1",ucs2:{decode:L,encode:M},decode:I,encode:K,toASCII:function(t){return x(t,function(t){return y.test(t)?"xn--"+K(t):t})},toUnicode:function(t){return x(t,function(t){return S.test(t)?I(t.slice(4).toLowerCase()):t})}},void 0===(i=function(){return s}.call(e,a,e,t))||(t.exports=i)}()}).call(this,a(8)(t),a(3))},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.default=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},a=e.selectorTypes,n=void 0===a?["ID","Class","Tag","NthChild"]:a,i=e.attributesToIgnore,o=void 0===i?["id","class","length"]:i,r=[],s=(0,d.getParents)(t),u=!0,c=!1,h=void 0;try{for(var p,g=s[Symbol.iterator]();!(u=(p=g.next()).done);u=!0){var f=m(p.value,n,o);Boolean(f)&&r.push(f)}}catch(t){c=!0,h=t}finally{try{!u&&g.return&&g.return()}finally{if(c)throw h}}var S=[],y=!0,v=!1,k=void 0;try{for(var b,w=r[Symbol.iterator]();!(y=(b=w.next()).done);y=!0){var T=b.value;S.unshift(T);var O=S.join(" > ");if((0,l.isUnique)(t,O))return O}}catch(t){v=!0,k=t}finally{try{!y&&w.return&&w.return()}finally{if(v)throw k}}return null};var n=a(88),i=a(89),o=a(90),r=a(91),s=a(92),u=a(93),l=a(94),d=a(95);function c(t,e){var a=t.parentNode.querySelectorAll(e);return 1===a.length&&a[0]===t}function h(t,e){return e.find(c.bind(null,t))}function p(t,e,a){var n=(0,o.getCombinations)(e,3),i=h(t,n);return Boolean(i)?i:Boolean(a)&&(i=h(t,n=n.map(function(t){return a+t})),Boolean(i))?i:null}function m(t,e,a){var o=void 0,l=function(t,e,a){var o={Tag:u.getTag,NthChild:s.getNthChild,Attributes:function(t){return(0,r.getAttributes)(t,a)},Class:i.getClassSelectors,ID:n.getID};return e.reduce(function(e,a){return e[a]=o[a](t),e},{})}(t,e,a),d=!0,h=!1,m=void 0;try{for(var g,f=e[Symbol.iterator]();!(d=(g=f.next()).done);d=!0){var S=g.value,y=l.ID,v=l.Tag,k=l.Class,b=l.Attributes,w=l.NthChild;switch(S){case"ID":if(Boolean(y)&&c(t,y))return y;break;case"Tag":if(Boolean(v)&&c(t,v))return v;break;case"Class":if(Boolean(k)&&k.length&&(o=p(t,k,v)))return o;break;case"Attributes":if(Boolean(b)&&b.length&&(o=p(t,b,v)))return o;break;case"NthChild":if(Boolean(w))return w}}}catch(t){h=!0,m=t}finally{try{!d&&f.return&&f.return()}finally{if(h)throw m}}return"*"}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getID=function(t){var e=t.getAttribute("id");return null===e||""===e||e.match(/^wovn/)?null:"#"+e}},function(t,e,a){"use strict";function n(t){if(!t.hasAttribute("class"))return[];try{var e=Array.prototype.slice.call(t.classList);return(e=e.filter(function(t){return/^wovn/.test(t)?null:t})).filter(function(t){return/^[a-z_-][a-z\d_-]*$/i.test(t)?t:null})}catch(e){var a=t.getAttribute("class");return(a=a.trim().replace(/\s+/g," ")).split(" ")}}Object.defineProperty(e,"__esModule",{value:!0}),e.getClasses=n,e.getClassSelectors=function(t){return n(t).filter(Boolean).map(function(t){return"."+t})}},function(t,e,a){"use strict";function n(t,e,a,i,o,r,s){if(r!==s)for(var u=i;u<=o&&o-u+1>=s-r;++u)a[r]=e[u],n(t,e,a,u+1,o,r+1,s);else t.push(a.slice(0,r).join(""))}Object.defineProperty(e,"__esModule",{value:!0}),e.getCombinations=function(t,e){for(var a=[],i=t.length,o=[],r=1;r<=e;++r)n(a,t,o,0,i-1,0,r);return a}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getAttributes=function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:["id","class","length"],a=t.attributes;return[].concat(function(t){if(Array.isArray(t)){for(var e=0,a=Array(t.length);e<t.length;e++)a[e]=t[e];return a}return Array.from(t)}(a)).reduce(function(t,a){return e.indexOf(a.nodeName)>-1||t.push("["+a.nodeName+'="'+a.value+'"]'),t},[])}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getNthChild=function(t){var e=0,a=void 0,i=void 0,o=t.parentNode;if(Boolean(o)){var r=o.childNodes,s=r.length;for(a=0;a<s;a++)if(i=r[a],(0,n.isElement)(i)&&(e++,i===t))return":nth-child("+e+")"}return null};var n=a(51)},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getTag=function(t){return t.tagName.toLowerCase().replace(/:/g,"\\:")}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.isUnique=function(t,e){if(!Boolean(e))return!1;var a=t.ownerDocument.querySelectorAll(e);return 1===a.length&&a[0]===t}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e.getParents=function(t){for(var e=[],a=t;(0,n.isElement)(a);)e.push(a),a=a.parentNode;return e};var n=a(51)},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(0),i=a(35),o=a(11),r=a(55),s=a(7),u=null,l=null,d=!1,c=null,h=[" \f\n\r\t\v   - \u2028\u2029  　\ufeff","0123456789","!\"#$%&'()*+,\\-ー./\\:;<=>?@\\[\\]^_`{|}~"].reduce(function(t,e){for(var a=0;a<e.length;++a)t[e[a]]=!0;return t},{}),p=function(){function t(){this.convertedCodes=null,this.init()}return t.prototype.init=function(){u=null,l=null,d=!1,c=null,this.langHash=n.default.c("RailsBridge").langHash,this.langCodeAliases=this.getLangCodeAliases(),this.currentLangOfWidgetTag=n.default.getBackendCurrentLang()},t.prototype.getLangCodeAliases=function(){var t=n.default.tag.getAttribute("langCodeAliases"),e=""!==t?s.default.parseJSON(t):{};for(var a in e)e.hasOwnProperty(a)&&(this.langHash[a]&&""!==e[a]||delete e[a]);return e},t.prototype.get=function(t){if(t.code&&(t=t.code),"string"!=typeof t)return null;for(var e in t=t.toLowerCase(),this.langHash)if(this.langHash.hasOwnProperty(e)&&(t===this.langHash[e].name.toLowerCase()||t===this.langHash[e].code.toLowerCase()||t===this.langHash[e].en.toLowerCase()))return this.langHash[e];for(var e in this.langCodeAliases)if(this.langCodeAliases.hasOwnProperty(e)&&t===this.langCodeAliases[e].toLowerCase())return this.langHash[e];return null},t.prototype.iso6391Normalization=function(t){return t.replace(/zh-CHT/i,"zh-Hant").replace(/zh-CHS/i,"zh-Hans")},t.prototype.getCode=function(t){var e=this.get(t);return e&&e.code},t.prototype.getCodes=function(){var t=[];for(var e in this.langHash)this.langHash.hasOwnProperty(e)&&t.push(e);return t},t.prototype.isCode=function(t){return this.langHash.hasOwnProperty(t)},t.prototype.isAlias=function(t){for(var e in this.langCodeAliases)if(this.langCodeAliases.hasOwnProperty(e)&&t===this.langCodeAliases[e])return!0;return!1},t.prototype.hasAlias=function(t){return Boolean(this.langCodeAliases[t])},t.prototype.isCaseInsensitiveCode=function(t){for(var e in this.langHash)if(this.langHash.hasOwnProperty(e)&&t.toLowerCase()===e.toLowerCase())return!0;return!1},t.prototype.isCaseInsensitiveAlias=function(t){for(var e in this.langCodeAliases)if(this.langCodeAliases.hasOwnProperty(e)&&t.toLowerCase()===this.langCodeAliases[e].toLowerCase())return!0;return!1},t.prototype.setDefaultCodeAndRecomputeSecondaryCode=function(t){u=t,l=this.computeSecondaryCode()},t.prototype.getDefaultCodeIfExists=function(){return u||(u=(u=n.default.tag.getAttribute("backend")&&n.default.tag.getAttribute("defaultLang"))||o.default.getLang()),u},t.prototype.getSecondaryCode=function(){return null===l&&(l=this.computeSecondaryCode()),l},t.prototype.computeSecondaryCode=function(){var t=o.default.getSecondaryLang(),e=o.default.getTranslatableLangs();return t&&-1!==s.default.indexOf(e,t)||(t=this.getDefaultCodeIfExists()),t},t.prototype.missingAutoTranslateLangs=function(){var t=o.default.getTranslatableLangs(),e=o.default.getAutoTranslateLangs();return s.default.setComplement(e,t).length>0},t.prototype.missingAutoPublishLangs=function(){var t=o.default.getTranslatableLangs(),e=o.default.getAutoPublishLangs();return s.default.setComplement(e,t).length>0},t.prototype.isNeedChangeUrlForSetDocLang=function(t){if(o.default.hasNoAutomaticRedirection())return!1;var e=o.default.getOptions().lang_path;return("query"===e||"path"===e||n.default.isBackend()&&n.default.tag.getAttribute("urlPattern")&&(!i.default.isCrawler()||i.default.isCrawler&&!o.default.getOptions().prevent_bot_redirection))&&n.default.c("Url").getLangCode()!==t},t.prototype.isNeedChangeUrlForSetDocLangWithoutSwap=function(t){if(o.default.hasNoAutomaticRedirection())return!1;var e=o.default.getOptions().lang_path;return("query"===e||"path"===e||n.default.isBackend()&&n.default.tag.getAttribute("urlPattern"))&&n.default.c("Url").getLangCode()!==t},t.prototype.setDocLang=function(t){var e=this.getCurrentLang();if(e){t=t||this.getDocLang();var a=o.default.getTranslatableLangs();!1!==s.default.includes(a,t)&&(o.default.hasPublishedLang()&&this.setHtmlLangAttribute(t),this.isNeedChangeUrlForSetDocLang(t)&&n.default.c("Url").changeUrl(t),o.default.hasPublishedLang()&&r.default.set(t),this.shouldSwapVals(e,t)&&n.default.c("DomAuditor").supervisedSwapVals(t),c=t,e!==t&&setTimeout(function(){n.default.c("Api").dispatchLangChangedEvent()},0),n.default.c("OnDemandTranslator").clearOdtResults(),d=!0)}},t.prototype.setHtmlLangAttribute=function(t){document.getElementsByTagName("html")[0].setAttribute("lang",this.iso6391Normalization(t))},t.prototype.getCurrentLang=function(){return d?this.getDocLang():this.getDefaultCodeIfExists()},t.prototype.shouldSwapVals=function(t,e){return t===e||t!==e&&!o.default.hasDomainPrecacheFeature()},t.prototype.setDocLangWithoutSwap=function(t){var e=this.getCurrentLang();if(e){t=t||this.getDocLang();var a=o.default.getTranslatableLangs();!1!==s.default.includes(a,t)&&(o.default.hasPublishedLang()&&this.setHtmlLangAttribute(t),this.isNeedChangeUrlForSetDocLangWithoutSwap(t)&&n.default.c("Url").changeUrl(t),o.default.hasPublishedLang()&&r.default.set(t),c=t,e!==t&&setTimeout(function(){n.default.c("Api").dispatchLangChangedEvent()},0),d=!0)}},t.prototype.isValidLangCode=function(t){if(null===t)return!1;if(t===this.getDefaultCodeIfExists())return!0;if(!this.convertedCodes){this.convertedCodes={};for(var e=o.default.getConvertedLangs(),a=0;a<e.length;a++)this.convertedCodes[e[a].code]=!0}return this.convertedCodes[t]||!1},t.prototype.getActualLang=function(){return d?this.getDocLang():n.default.isBackend()&&this.isValidLangCode(this.currentLangOfWidgetTag)?this.currentLangOfWidgetTag:this.getDefaultCodeIfExists()},t.prototype._getDocLang=function(){var t=this.getDefaultCodeIfExists(),e=this.getSecondaryCode(),a=r.default.get(),o=!!a,s=n.default.c("Url").getLangCode(),u=this.getBrowserLang(),l=!n.default.c("Data").hasIgnoreBrowserLang()&&!o;if(i.default.isDataHighlighter())return n.default.isBackend()&&this.isValidLangCode(s)?s:t;if(n.default.isBackend()){var d=n.default.getBackendCurrentLang();return n.default.c("Data").hasNoAutomaticRedirection()?l&&this.isValidLangCode(d)?u:d:l&&this.isValidLangCode(u)?u:(d!==t||o)&&this.isValidLangCode(d)?d:e}return t!==s&&this.isValidLangCode(s)?s:this.isValidLangCode(a)?a:this.isValidLangCode(u)?u:e},t.prototype.getDocLang=function(){return c||(c=this._getDocLang())},t.prototype.getBrowserLang=function(){var t=window.navigator.languages&&window.navigator.languages[0]||window.navigator.language||window.navigator.userLanguage||window.navigator.browserLanguage;return this.browserLangCodeToWidgetLangCode(t)},t.prototype.browserLangCodeToWidgetLangCode=function(t){var e=this.getCodes(),a=null;switch(t.toLowerCase()){case"zh-tw":a="zh-CHT";break;case"zh-cn":case"zh":a="zh-CHS";break;case"iw":a="he";break;default:a=t}if(a)for(var n=0;n<e.length;n++){if(e[n]===a)return e[n];var i=new RegExp("^"+e[n],"i");if(a.match(i))return e[n]}return null},t.prototype.getLangIdentifier=function(t){return n.default.isBackend()&&this.langCodeAliases[t]||this.getCode(t)},t.prototype.getBackendLangIdentifier=function(){var t=c||n.default.getBackendCurrentLang();return this.getLangIdentifier(t)},t.prototype.isKoreanText=function(t){if(t){for(var e=0,a=0,n=0;n<t.length;++n){var i=t[n],o=t.charCodeAt(n);o>=44032&&o<=55203?e+=1:h[i]&&(a+=1)}if(a<t.length)return e/(t.length-a)>=.9}return!1},t.prototype.defaultLangAlias=function(){return this.langCodeAliases[n.default.getBackendDefaultLang()]},t}();e.default=p},function(t,e,a){!function(){var e=a(98),n=a(53).utf8,i=a(99),o=a(53).bin,r=function(t,a){t.constructor==String?t=a&&"binary"===a.encoding?o.stringToBytes(t):n.stringToBytes(t):i(t)?t=Array.prototype.slice.call(t,0):Array.isArray(t)||(t=t.toString());for(var s=e.bytesToWords(t),u=8*t.length,l=1732584193,d=-271733879,c=-1732584194,h=271733878,p=0;p<s.length;p++)s[p]=16711935&(s[p]<<8|s[p]>>>24)|4278255360&(s[p]<<24|s[p]>>>8);s[u>>>5]|=128<<u%32,s[14+(u+64>>>9<<4)]=u;var m=r._ff,g=r._gg,f=r._hh,S=r._ii;for(p=0;p<s.length;p+=16){var y=l,v=d,k=c,b=h;d=S(d=S(d=S(d=S(d=f(d=f(d=f(d=f(d=g(d=g(d=g(d=g(d=m(d=m(d=m(d=m(d,c=m(c,h=m(h,l=m(l,d,c,h,s[p+0],7,-680876936),d,c,s[p+1],12,-389564586),l,d,s[p+2],17,606105819),h,l,s[p+3],22,-1044525330),c=m(c,h=m(h,l=m(l,d,c,h,s[p+4],7,-176418897),d,c,s[p+5],12,1200080426),l,d,s[p+6],17,-1473231341),h,l,s[p+7],22,-45705983),c=m(c,h=m(h,l=m(l,d,c,h,s[p+8],7,1770035416),d,c,s[p+9],12,-1958414417),l,d,s[p+10],17,-42063),h,l,s[p+11],22,-1990404162),c=m(c,h=m(h,l=m(l,d,c,h,s[p+12],7,1804603682),d,c,s[p+13],12,-40341101),l,d,s[p+14],17,-1502002290),h,l,s[p+15],22,1236535329),c=g(c,h=g(h,l=g(l,d,c,h,s[p+1],5,-165796510),d,c,s[p+6],9,-1069501632),l,d,s[p+11],14,643717713),h,l,s[p+0],20,-373897302),c=g(c,h=g(h,l=g(l,d,c,h,s[p+5],5,-701558691),d,c,s[p+10],9,38016083),l,d,s[p+15],14,-660478335),h,l,s[p+4],20,-405537848),c=g(c,h=g(h,l=g(l,d,c,h,s[p+9],5,568446438),d,c,s[p+14],9,-1019803690),l,d,s[p+3],14,-187363961),h,l,s[p+8],20,1163531501),c=g(c,h=g(h,l=g(l,d,c,h,s[p+13],5,-1444681467),d,c,s[p+2],9,-51403784),l,d,s[p+7],14,1735328473),h,l,s[p+12],20,-1926607734),c=f(c,h=f(h,l=f(l,d,c,h,s[p+5],4,-378558),d,c,s[p+8],11,-2022574463),l,d,s[p+11],16,1839030562),h,l,s[p+14],23,-35309556),c=f(c,h=f(h,l=f(l,d,c,h,s[p+1],4,-1530992060),d,c,s[p+4],11,1272893353),l,d,s[p+7],16,-155497632),h,l,s[p+10],23,-1094730640),c=f(c,h=f(h,l=f(l,d,c,h,s[p+13],4,681279174),d,c,s[p+0],11,-358537222),l,d,s[p+3],16,-722521979),h,l,s[p+6],23,76029189),c=f(c,h=f(h,l=f(l,d,c,h,s[p+9],4,-640364487),d,c,s[p+12],11,-421815835),l,d,s[p+15],16,530742520),h,l,s[p+2],23,-995338651),c=S(c,h=S(h,l=S(l,d,c,h,s[p+0],6,-198630844),d,c,s[p+7],10,1126891415),l,d,s[p+14],15,-1416354905),h,l,s[p+5],21,-57434055),c=S(c,h=S(h,l=S(l,d,c,h,s[p+12],6,1700485571),d,c,s[p+3],10,-1894986606),l,d,s[p+10],15,-1051523),h,l,s[p+1],21,-2054922799),c=S(c,h=S(h,l=S(l,d,c,h,s[p+8],6,1873313359),d,c,s[p+15],10,-30611744),l,d,s[p+6],15,-1560198380),h,l,s[p+13],21,1309151649),c=S(c,h=S(h,l=S(l,d,c,h,s[p+4],6,-145523070),d,c,s[p+11],10,-1120210379),l,d,s[p+2],15,718787259),h,l,s[p+9],21,-343485551),l=l+y>>>0,d=d+v>>>0,c=c+k>>>0,h=h+b>>>0}return e.endian([l,d,c,h])};r._ff=function(t,e,a,n,i,o,r){var s=t+(e&a|~e&n)+(i>>>0)+r;return(s<<o|s>>>32-o)+e},r._gg=function(t,e,a,n,i,o,r){var s=t+(e&n|a&~n)+(i>>>0)+r;return(s<<o|s>>>32-o)+e},r._hh=function(t,e,a,n,i,o,r){var s=t+(e^a^n)+(i>>>0)+r;return(s<<o|s>>>32-o)+e},r._ii=function(t,e,a,n,i,o,r){var s=t+(a^(e|~n))+(i>>>0)+r;return(s<<o|s>>>32-o)+e},r._blocksize=16,r._digestsize=16,t.exports=function(t,a){if(null==t)throw new Error("Illegal argument "+t);var n=e.wordsToBytes(r(t,a));return a&&a.asBytes?n:a&&a.asString?o.bytesToString(n):e.bytesToHex(n)}}()},function(t,e){!function(){var e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",a={rotl:function(t,e){return t<<e|t>>>32-e},rotr:function(t,e){return t<<32-e|t>>>e},endian:function(t){if(t.constructor==Number)return 16711935&a.rotl(t,8)|4278255360&a.rotl(t,24);for(var e=0;e<t.length;e++)t[e]=a.endian(t[e]);return t},randomBytes:function(t){for(var e=[];t>0;t--)e.push(Math.floor(256*Math.random()));return e},bytesToWords:function(t){for(var e=[],a=0,n=0;a<t.length;a++,n+=8)e[n>>>5]|=t[a]<<24-n%32;return e},wordsToBytes:function(t){for(var e=[],a=0;a<32*t.length;a+=8)e.push(t[a>>>5]>>>24-a%32&255);return e},bytesToHex:function(t){for(var e=[],a=0;a<t.length;a++)e.push((t[a]>>>4).toString(16)),e.push((15&t[a]).toString(16));return e.join("")},hexToBytes:function(t){for(var e=[],a=0;a<t.length;a+=2)e.push(parseInt(t.substr(a,2),16));return e},bytesToBase64:function(t){for(var a=[],n=0;n<t.length;n+=3)for(var i=t[n]<<16|t[n+1]<<8|t[n+2],o=0;o<4;o++)8*n+6*o<=8*t.length?a.push(e.charAt(i>>>6*(3-o)&63)):a.push("=");return a.join("")},base64ToBytes:function(t){t=t.replace(/[^A-Z0-9+\/]/gi,"");for(var a=[],n=0,i=0;n<t.length;i=++n%4)0!=i&&a.push((e.indexOf(t.charAt(n-1))&Math.pow(2,-2*i+8)-1)<<2*i|e.indexOf(t.charAt(n))>>>6-2*i);return a}};t.exports=a}()},function(t,e){function a(t){return!!t.constructor&&"function"==typeof t.constructor.isBuffer&&t.constructor.isBuffer(t)}
/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */t.exports=function(t){return null!=t&&(a(t)||function(t){return"function"==typeof t.readFloatLE&&"function"==typeof t.slice&&a(t.slice(0,0))}(t)||!!t._isBuffer)}},function(t,e,a){
/*!
  * domready (c) Dustin Diaz 2014 - License MIT
  */
t.exports=function(){var t,e=[],a=document,n=(a.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(a.readyState);return n||a.addEventListener("DOMContentLoaded",t=function(){for(a.removeEventListener("DOMContentLoaded",t),n=1;t=e.shift();)t()}),function(t){n?setTimeout(t,0):e.push(t)}}()},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(0),i=a(7),o=function(){function t(){this.init()}return t.prototype.init=function(){this._customDomainLanguages=this._deserializeCustomDomainLangs(),this._defaultLanguage=n.default.c("Lang").getDefaultCodeIfExists(),this._defaultLanguageCustomDomain=this._findCustomDomainWithLanguage(this._defaultLanguage)},t.prototype.findCustomDomainLanguage=function(t){var e=n.default.c("Url").getLocation(t),a=this._findCustomDomain(e.hostname);return this._customDomainLanguages[a]},t.prototype.removeLanguageFromAbsoluteUrl=function(t,e){var a=this._findCustomDomainWithLanguage(e);return a&&this._defaultLanguageCustomDomain?this._replaceCaseInsensitive(t,a,this._defaultLanguageCustomDomain):t},t.prototype.removeLanguageFromUrlHost=function(t,e){var a=this._findCustomDomainWithLanguage(e);return a&&this._defaultLanguageCustomDomain?this._replaceCaseInsensitive(t,a,this._defaultLanguageCustomDomain):t},t.prototype.addLanguageToAbsoluteUrl=function(t,e){var a=n.default.c("Url").getLocation(t),i=this._findCustomDomain(a.hostname),o=this._findCustomDomainWithLanguage(e);return i&&o?this._replaceCaseInsensitive(t,i,o):t},t.prototype._replaceCaseInsensitive=function(t,e,a){return t.replace(new RegExp(e,"i"),a)},t.prototype._findCustomDomain=function(t){return Object.keys(this._customDomainLanguages).filter(function(e){return t.toLowerCase()==e.toLowerCase()})[0]},t.prototype._findCustomDomainWithLanguage=function(t){var e=this;return Object.keys(this._customDomainLanguages).filter(function(a){return e._customDomainLanguages[a]===t})[0]},t.prototype._deserializeCustomDomainLangs=function(){var t=n.default.tag.getAttribute("custom_domain_langs");return""!==t?i.default.parseJSON(t):{}},t}();e.default=o},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(103),i=function(){function t(){}return t.prototype.create=function(t,e,a,i,o){return new n.default(t,e,a,i,o)},t}();e.default=i},function(t,e,a){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var a in e)e.hasOwnProperty(a)&&(t[a]=e[a])};return function(e,a){function n(){this.constructor=e}t(e,a),e.prototype=null===a?Object.create(a):(n.prototype=a.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(e,a,n,i,o){var r=t.call(this,e,a,i)||this;return r.isOpen=n,r.ignore=o,r}return n(e,t),Object.defineProperty(e.prototype,"isIgnored",{get:function(){return this.ignore},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isText",{get:function(){return!1},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"escapedSrc",{get:function(){return null},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"src",{get:function(){return this.label},enumerable:!0,configurable:!0}),e}(a(57).default);e.default=i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(105),i=function(){function t(){}return t.prototype.create=function(t,e,a,i,o,r,s,u){return new n.default(t,e,a,i,o,r,s,u)},t}();e.default=i},function(t,e,a){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var a in e)e.hasOwnProperty(a)&&(t[a]=e[a])};return function(e,a){function n(){this.constructor=e}t(e,a),e.prototype=null===a?Object.create(a):(n.prototype=a.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=a(57),o={"'":"&#39;","&":"&amp;",'"':"&quot;","<":"&lt;",">":"&gt;"},r=new RegExp("["+Object.keys(o).join("")+"]","g"),s=function(t){function e(e,a,n,i,o,r,s,u){var l=t.call(this,e,a,!1)||this;return l.text=n,l.original=i,l.nodes=o,l.lookahead=r,l.skipCount=s,l.isHtml=u,l}return n(e,t),Object.defineProperty(e.prototype,"isText",{get:function(){return!0},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"isIgnored",{get:function(){return!1},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"escapedSrc",{get:function(){return this.htmlEscapeText(this.label).replace(/\u200b/g,"")},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"escapedLabel",{get:function(){return this.isHtml?this.label:this.htmlEscapeText(this.label)},enumerable:!0,configurable:!0}),Object.defineProperty(e.prototype,"src",{get:function(){return this.escapedSrc},enumerable:!0,configurable:!0}),e.prototype.htmlEscapeText=function(t){return t.replace(r,function(t){return o[t]})},e}(i.default);e.default=s},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(107),i=function(){function t(){}return t.prototype.create=function(t,e){return new n.default(t,e)},t}();e.default=i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(t,e){this.headPath=t,this.index=e,this.fragments=[]}return Object.defineProperty(t.prototype,"path",{get:function(){if(this.headPath.match(/title$/))return this.headPath;var t=this.headPath+"/text()";return 1===this.index?t:t+"["+this.index+"]"},enumerable:!0,configurable:!0}),t.prototype.add=function(t){0===this.fragments.length&&t.isClose||this.fragments.push(t)},Object.defineProperty(t.prototype,"src",{get:function(){return this.removeWovnIgnore(this.fragments).map(function(t){return t.src}).join("")},enumerable:!0,configurable:!0}),Object.defineProperty(t.prototype,"lastFragment",{get:function(){return this.fragments[this.fragments.length-1]},enumerable:!0,configurable:!0}),t.prototype.isComplex=function(){return this.fragments.length>1},t.prototype.removeWovnIgnore=function(t){for(var e=[],a=0;a<t.length;++a){var n=t[a];if(n.isIgnored){for(e.push(n),++a;a<t.length;++a)if(!(n=t[a]).isText){e.push(n);break}}else e.push(n)}return e},t.prototype.hasText=function(){for(var t=0,e=this.fragments;t<e.length;t++)if(e[t].isText)return!0;return!1},t.prototype.buildNextStack=function(){return new t(this.headPath,this.index+1)},t}();e.default=n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(109),i=function(){function t(){}return t.prototype.create=function(t,e){return new n.default(t,e)},t}();e.default=i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(t,e){this.xpath=t,this.element=e}return t.prototype.hasAttribute=function(t){return this.element.hasAttribute(t)},t.prototype.getAttribute=function(t){return this.element.getAttribute(t)},t.prototype.setAttribute=function(t,e){this.element.setAttribute(t,e)},Object.defineProperty(t.prototype,"nodeName",{get:function(){return this.element.nodeName},enumerable:!0,configurable:!0}),t}();e.default=n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(52),i=function(){function t(){}return t.prototype.loadFromStore=function(){return n.default.loadFromStore()},t.prototype.onlyShowLangs=function(t){n.default.onlyShowLangs(t)},t.prototype.create=function(t,e,a,i){return new n.default(t,e,a,i)},t.prototype.clearData=function(){n.default.clearData()},t}();e.default=i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(11),i=function(){function t(){}return t.prototype.load=function(){this.insertTag(n.default.getPageCss(),n.default.get().widgetOptions.domain_css,"css"),n.default.get().widgetOptions.js_customization&&this.insertTag(n.default.getPageJs(),n.default.get().widgetOptions.domain_js,"js")},t.prototype.insertTag=function(t,e,a){var n=document.head||document.body,i=document.getElementById("wovn-page-"+a),o=document.getElementById("wovn-domain-"+a);i&&n.removeChild(i),o&&n.removeChild(o);var r="js"===a?"script":"style",s=document.createElement(r),u=document.createElement(r);s.setAttribute("id","wovn-page-"+a),u.setAttribute("id","wovn-domain-"+a),s.appendChild(document.createTextNode(t)),u.appendChild(document.createTextNode(e)),n.appendChild(u),n.appendChild(s)},t.prototype.insertJsOnce=function(t,e){document.getElementById("wovn-page-js")||document.getElementById("wovn-domain-js")||this.insertTag(t,e,"js")},t}();e.default=i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(59),i=a(113),o=a(60),r=a(0);e.default={go:function(t,e,a,s){if("function"==typeof e&&"function"==typeof a&&"function"==typeof s){var u,l,d={head:document.head||document.getElementsByTagName("head")[0],limit:-1,filter:function(t){return t.nodeName.toLowerCase().match(/script|noscript|style/)},target:function(t){return"#comment"!==t.nodeName}};if(t.hasOwnProperty("head")&&t.head&&(l=t.head,(u=n.default.getXpath(l))&&(u="#text"===l.nodeName?u.replace(/\/text\(\)$/,""):u.replace(new RegExp("/"+l.nodeName.toLowerCase()+"$"),""))),u||(l=d.head,u="/html"),t.hasOwnProperty("headXPath")&&"string"==typeof t.headParentXpath||(t.headParentXpath=d.headParentXpath),t.hasOwnProperty("limit")&&"number"==typeof t.limit?t.limit=Math.floor(t.limit):t.limit=d.limit,0!==t.limit){if(t.hasOwnProperty("filter")?"function"==typeof t.filter||("object"==typeof t.filter&&t.filter.nodeName?t.filter=function(t){return function(e){return e.nodeName.toLowerCase().match(/script|noscript|style/)||e.nodeName.toLowerCase()===t}}(t.filter.nodeName.toLowerCase()):"string"==typeof t.filter?t.filter=function(t){return function(e){return e.nodeName.toLowerCase().match(/script|noscript|style/)||e.nodeName.toLowerCase()===t}}(t.filter.toLowerCase()):t.filter=d.filter):t.filter=d.filter,t.hasOwnProperty("target")&&"function"!=typeof t.target)if("object"==typeof t.target&&t.target.length){for(var c="",h=0;h<t.target.length;h++)c+=(t.target[h].nodeName||t.target[h])+"|";c="^("+c.substr(0,c.length-1)+")$";var p=new RegExp(c,"i");t.target=function(t){return function(e){return t.test(e.nodeName)}}(p)}else"object"==typeof t.target&&t.target.nodeName?t.target=function(t){return function(e){return e.nodeName.toLowerCase()===t}}(t.target.nodeName.toLowerCase()):"string"==typeof t.target?t.target=function(t){return function(e){return e.nodeName.toLowerCase()===t}}(t.target.toLowerCase()):t.target=d.target;else t.target=d.target;var m=t.attributes,g=(document.head||document.getElementsByTagName("head")[0]).parentElement;!function n(u,l,d){if(l){var c={};c[l.nodeName]=1;for(var h=l,p=l.nextSibling;p;){c[y=p.nodeName]=c[y]?c[y]+1:1,h=p,p=p.nextSibling}for(var f=!0,S=(l=h)&&l.previousSibling;f?f=!1:S=(l=S)&&l.previousSibling,l;){if(l===g)return;if(t.filter(l,u)||r.default.c("Interface").isWidgetElement(l))s(l,u),x(c,l.nodeName);else{var y,v=!1,k=d||i.default.isIdentifiableThirdPartyNode(l),b=void 0;if("#text"===(y=l.nodeName)){if(/^\s+$/.test(l.nodeValue)){x(c,y);continue}b="text()"}else b=y.toLowerCase();var w=c[y]>1?"["+c[y]+"]":"",T=u+"/"+b+w;if(t.target(l,T)&&0!==t.limit&&(v=e(l,T,k,t),--t.limit),a(l,T,k),0===t.limit)return;if(l.hasChildNodes()&&!v&&n(T,l.firstChild,k),"IFRAME"===y){var O=null;try{O=l.contentDocument}catch(t){}O&&n("",O.firstChild,k)}if(o.default.bindOdtClickEvent(l),m&&l.hasAttribute)for(var _ in m)if(l.hasAttribute(_)&&0!==t.limit){T=u+"/"+l.nodeName+"[@"+_+"]"+w;m[_](l,T),--t.limit}x(c,y)}}}function x(t,e){t[e]--}}(u,l,!!l.parent&&i.default.isIdentifiableThirdPartyNode(l.parent))}}}}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=[new i("DIV","id","intercom-container"),new i("IFRAME","id","intercom-frame"),new i("DIV","class","gm-style"),new i("IFRAME","id","pop-veritrans")];function i(t,e,a){this.name=t,this.attr=e,this.val=a,this.matchesElement=function(t){return(!this.name||t.nodeName===this.name)&&t.getAttribute(this.attr)===this.val}}e.default={isIdentifiableThirdPartyNode:function(t){if(t&&1==t.nodeType)for(var e=0;e<n.length;++e)if(n[e].matchesElement(t))return!0;return!1}}},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(0),i=a(115),o={},r=[],s=function(){function t(){}return t.prototype.fuzzyMatch=function(t,e){var a=this,i=Object.keys(t),o=n.default.c("ValueStore").getNewDetectedValueSet();return Object.keys(o).forEach(function(e){var n=a._findBestMatch(e,i);if(a._shouldSwap(n.distanceFromSrc,e)&&t[n.valueToSwap]){var o={existSrc:n.valueToSwap,similarSrc:e,xpath:t[n.valueToSwap].path};!r.some(function(t){return t.similarSrc===o.similarSrc})&&r.push(o)}}),r},t.prototype.getServerFormattedFuzzyMatches=function(){return r.map(function(t){return{exist_src:t.existSrc,similar_src:t.similarSrc,xpath:t.xpath}})},t.prototype._findBestMatch=function(t,e){var a=this;o[t]=void 0===o[t]?{}:o[t];var i,r=Number.MAX_VALUE,s="",u=n.default.c("Utils").decodeHTMLEntities(t);return e.forEach(function(t){var e=n.default.c("Utils").decodeHTMLEntities(t);a._isValueTooDifferentForFuzzyMatching(u,e)||(i=a._getEditDistanceFromCacheOrRecalculate(u,e))<r&&(r=i,s=t)}),{valueToSwap:s,distanceFromSrc:r}},t.prototype._getEditDistanceFromCacheOrRecalculate=function(t,e){if(o[t]&&o[t][e])return o[t][e];var a=i.get(t,e,{useCollator:!0});return o[t]||(o[t]={}),o[t][e]=a,a},t.prototype._isValueTooDifferentForFuzzyMatching=function(t,e){var a=.05*t.length,n=Math.abs(t.length-e.length);return n>a&&n>5},t.prototype._shouldSwap=function(t,e){return t/e.length<.05&&t<5},t}();e.default=new s},function(t,e,a){(function(t){var n;!function(){"use strict";var i;try{i="undefined"!=typeof Intl&&void 0!==Intl.Collator?Intl.Collator("generic",{sensitivity:"base"}):null}catch(t){console.log("Collator could not be initialized and wouldn't be used")}var o=[],r=[],s={get:function(t,e,a){var n,s,u,l,d,c,h=a&&i&&a.useCollator,p=t.length,m=e.length;if(0===p)return m;if(0===m)return p;for(u=0;u<m;++u)o[u]=u,r[u]=e.charCodeAt(u);if(o[m]=m,h)for(u=0;u<p;++u){for(s=u+1,l=0;l<m;++l)n=s,c=0===i.compare(t.charAt(u),String.fromCharCode(r[l])),(s=o[l]+(c?0:1))>(d=n+1)&&(s=d),s>(d=o[l+1]+1)&&(s=d),o[l]=n;o[l]=s}else for(u=0;u<p;++u){for(s=u+1,l=0;l<m;++l)n=s,c=t.charCodeAt(u)===r[l],(s=o[l]+(c?0:1))>(d=n+1)&&(s=d),s>(d=o[l+1]+1)&&(s=d),o[l]=n;o[l]=s}return s}};null!==a(116)&&a(117)?void 0===(n=function(){return s}.call(e,a,e,t))||(t.exports=n):null!==t&&void 0!==e&&t.exports===e?t.exports=s:"undefined"!=typeof self&&"function"==typeof self.postMessage&&"function"==typeof self.importScripts?self.Levenshtein=s:"undefined"!=typeof window&&null!==window&&(window.Levenshtein=s)}()}).call(this,a(8)(t))},function(t,e){t.exports=function(){throw new Error("define cannot be used indirect")}},function(t,e){(function(e){t.exports=e}).call(this,{})},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(0),i=a(7);function o(t,e){return new Promise(function(a,o){var r=function(t,e){return n.default.c("RailsBridge").apiHost+"domains/"+n.default.tag.getAttribute("key")+"/search?q="+encodeURIComponent(t)+"&lang="+encodeURIComponent(e)}(t,e);i.default.sendRequestAsJson("GET",r,function(t){a(t.results)},function(t){!function(t){if(t&&400<=t.status&&t.status<500)try{var e=JSON.parse(t.responseText);o(e.message||"Server error")}catch(t){return void o("Server error")}else o("Server error")}(t)})})}var r=function(){function t(){}return t.prototype.search=function(t,e,a,n){o(t,e).then(function(t){a(t)}).catch(function(t){n(t)})},t}();e.default=r},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(7),i=a(0);e.notFoundOccurrences=["404","не е намерена","未找到","未找到","ikke fundet","niet gevonden","not found","ei löydetty","pas trouvé","non trouvé","introuvable","nicht gefunden","δεν βρέθηκε","לא נמצא","नहीं मिला","tidak ditemukan","non trovato","見つかりません","찾을 수 없음","tidak ditemui","ikke funnet","nie znaleziono","não encontrado","не обнаружена","extraviado","no encontrada","hittades inte","ไม่พบ","bulunamadı","не знайдено","không tìm thấy"];var o=new RegExp("("+e.notFoundOccurrences.join("|")+")","i"),r=function(){function t(){this.supervised=null}return t.prototype.isSupervisedPage=function(){return null===this.supervised&&(this.supervised=document.documentElement.hasAttribute("wovn-supervised")),this.supervised},t.prototype.notifyWovnIfNotFound=function(){var t;(-1!==document.title.search(o)||(t=document.body.innerText)&&-1!==t.search(o))&&n.default.sendRequest("HEAD",window.location.href,null,function(){},function(t){404===t.status&&function(){var t=n.default.createXHR(),e=i.default.c("RailsBridge").apiHost.replace(/^.*\/\//,"//")+"page_not_found/"+i.default.tag.getAttribute("key");t.open("POST",e,!0),t.setRequestHeader("Content-Type","application/x-www-form-urlencoded"),t.send("url="+i.default.c("Url").getEncodedLocation())}()})},t}();e.default=new r},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.prototype.getUrlsFromCss=function(t){var e=[];return t.split(/,\s+/).forEach(function(t){var a=/^url\(["']?([^"']+?)["']?\)?$/.exec(t);a&&e.push(a[1])}),e},t}();e.default=n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(36),i={page_request_start:null,page_response_end:null,wovn_js_request_start:null,wovn_js_response_end:null},o=function(){function t(){this.isMonitorable=!1,this.resetIsMonitorable()}return t.prototype.mark=function(t){if(0!=this.isMonitorable){var e="wovn_"+t;null!=i[e]&&null!=i[e]||(i[e]=(new Date).getTime())}},t.prototype.getResult=function(){if(0==this.isMonitorable)return{};for(var t=Object.keys(i),e={},a=0;a<t.length;a++){var n=t[a],o=n;new RegExp("wovn_").test(o)&&(o=o.substring("wovn_".length)),e[o]=i[n]}return e},t.prototype.resetIsMonitorable=function(){"true"===n.default.get("wovn_monitor_enable")?this.isMonitorable=!0:this.isMonitorable=!1},t}();e.default=new o},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(t){void 0===t&&(t=1e3),this.coolDownTime=t,this.workableId=0,this.isExecuting=!1,this.previousExecutedTime=null}return t.prototype.isCoolingDown=function(t){return this.previousExecutedTime&&this.previousExecutedTime+this.coolDownTime>t},t.prototype.executeSetTimeout=function(t,e,a,n,i){var o=this;return function(n,i){return setTimeout(function(){!function(a,n){a===o.workableId&&(o.isExecuting=!0,o.previousExecutedTime=null,t.apply(o,n),o.previousExecutedTime=(new Date).getTime(),o.isExecuting=!1,e())}(n,i)},a)}(n,i)},t.prototype.createSingleWorker=function(e){return void 0===e&&(e=1e3),new t(e)},t.prototype.setTimeout=function(t,e,a){var n=(new Date).getTime();if(!this.isExecuting){if(this.isCoolingDown(n)){var i=this.previousExecutedTime+this.coolDownTime;a=Math.max(i+100,a+n)-n}this.workableId=(this.workableId+1)%1e4;var o=Array.prototype.slice.call(arguments).slice(3);return this.executeSetTimeout(t,e,a,this.workableId,o)}},t}();e.default=new n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(124),i=a(125),o=a(0),r={},s={createFromUrl:function(t){var e=function(t){var e=o.default.c("Url").getLangCode(t);return e?(r[t]||(r[t]={}),r[t][e]||(r[t][e]=i.default.getLocation(t)),r[t][e]):i.default.getLocation(t)}(t),a=i.default.getNormalizedHost(e),s=/^https?:\/\//.test(t),u=("/"!==e.pathname.charAt(0)?"/":"")+e.pathname;s&&/^https?:\/\/.[^\/]+$/.test(t)&&(u="");var l=new n.default(e.protocol,a,u,e.search,e.hash);if(!s)if(/^\//.test(t))l.setToShowUrlFromPath();else{var d=l.getOriginalUrl();l.setBaseIgnorePath(d.substr(0,d.indexOf(t)))}return l},create:function(t,e,a,i,o){return new n.default(t,e,a,i,o)}};e.default=s},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(58),i=a(61),o=a(0),r=function(){function t(t,e,a,n,i){this.protocol=t,this.host=e,this.pathname=a,this.search=n,this.hash=i,this.fromPath=!1,this.baseIgnorePath=null}return t.prototype.setShowFullUrl=function(){this.fromPath=!1,this.baseIgnorePath=null},t.prototype.setToShowUrlFromPath=function(){this.fromPath=!0},t.prototype.setBaseIgnorePath=function(t){this.baseIgnorePath=t},t.prototype.getOriginalUrl=function(){return this.createUrl(this.protocol,this.host,this.pathname,this.search,this.hash)},t.prototype.getNormalizedPageUrl=function(t,e){var a=this.getOriginalUrl();if(t){var i=o.default.c("Lang").getBackendLangIdentifier();switch(e){case"query":var r=this.search.replace(new RegExp("(\\?|&)wovn="+i+"(&|$)"),"$1").replace(/(\?|&)$/,"");a=this.createUrl(this.protocol,this.host,this.pathname,r,this.hash);break;case"subdomain":a=a.replace(new RegExp("//"+i+"\\.","i"),"//");break;case"custom_domain":a=o.default.c("CustomDomainLanguages").removeLanguageFromAbsoluteUrl(a,i);break;case"path":var s=n.default.getSitePrefixPath();if(s){var u=this.pathname.replace(new RegExp("^/("+s+")/"+i+"(/|$)","i"),"/$1$2");a=this.createUrl(this.protocol,this.host,u,this.search,this.hash)}else{u=this.pathname;var l=o.default.c("Lang").defaultLangAlias();u=l?this.pathname.replace(new RegExp("^(/)?"+i+"(/|$)","i"),"/"+l+"$2"):this.pathname.replace(new RegExp("^(/)?"+i+"(/|$)","i"),"$2"),a=this.createUrl(this.protocol,this.host,u,this.search,this.hash)}}}return a},t.prototype.getConvertedLangUrl=function(t,e,a){var i,r=this.getOriginalUrl(),s=o.default.c("Lang").getLangIdentifier(t),u=o.default.c("Lang").getLangIdentifier(e),l=o.default.c("Lang").getDefaultCodeIfExists();if(!l)return null;switch(a){case"query":i=(i=(i=e===l?r.replace(/([\?&])wovn=[^#&]*&?/,"$1"):r.match(/[\?&]wovn=[^&#]*/)?r.replace(/([\?&])wovn=[^&#]*/,"$1wovn="+u):r.match(/\?/)?r.replace(/\?/,"?wovn="+u+"&"):r.replace(/(#|$)/,"?wovn="+u+"$1")).replace(/&$/,"")).replace(/\?$/,"");break;case"custom_domain":i=o.default.c("CustomDomainLanguages").addLanguageToAbsoluteUrl(r,u);break;case"subdomain":i=e===l?r.replace(new RegExp("://"+s.toLowerCase()+"\\.","i"),"://"):t===l?r.replace(new RegExp("://","i"),"://"+u.toLowerCase()+"."):r.replace(new RegExp("://"+s.toLowerCase()+"\\.","i"),"://"+u.toLowerCase()+".");break;case"path":var d=function(t,e,a){if("path"!==t)return e;var i=o.default.c("Lang").getLangIdentifier(a),r=n.default.getSitePrefixPath();return r?e.replace(new RegExp("^(/"+r+")/"+i+"(/|$)"),"$1$2"):e.replace(new RegExp("^/"+i+"(/|$)"),"$1")}(a,this.pathname,t);d=function(t,e,a){var i=o.default.c("Lang").getDefaultCodeIfExists();if(!i)return null;if("path"!==t)return e;if(a===i&&!o.default.c("Lang").hasAlias(i))return e;var r=o.default.c("Lang").getLangIdentifier(a),s=n.default.getSitePrefixPath();return s?e.replace(new RegExp("^(/"+s+")(/|$)"),"$1/"+r+"$2"):"/"+r+e}(a,d,e),i=this.createUrl(this.protocol,this.host,d,this.search,this.hash);break;default:i=r}return i},t.prototype.createUrl=function(t,e,a,n,o){var r=t+"//"+e+a+n+o;return this.baseIgnorePath?r=i.default.startsWith(r,this.baseIgnorePath,0)?r.replace(this.baseIgnorePath,""):a+n+o:this.fromPath&&(r=a+n+o),r},t.prototype.extractHost=function(){return this.host},t}();e.default=r},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n={getLocation:function(t){var e=document.createElement("a");if(e.href=t,e.href=e.href,""===e.host){var a=window.location.protocol+"//"+window.location.host;if("/"===t.charAt(1))e.href=a+t;else{var n=("/"+e.pathname).match(/.*\//)[0];e.href=a+n+t}}return e},getNormalizedHost:function(t){var e=t.host;return"http:"===t.protocol&&/:80$/.test(e)?e=e.replace(/:80$/,""):"https:"===t.protocol&&/:443$/.test(e)&&(e=e.replace(/:443$/,"")),e}};e.default=n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(2),i=a(7),o=a(0),r=function(){function t(){this.stallion=null,this.started=!1,this.messageHandler=this.onStallionMessage.bind(this),this.requestCallbacks={},this.lastMessageId=0}return t.prototype.start=function(){this.started=!0,i.default.onEvent(window.self,"message",this.messageHandler),this.startRPC()},t.prototype.stop=function(){this.started=!1,this.stallion=null,i.default.removeHandler(window.self,"message",this.messageHandler),this.stopRPC()},t.prototype.sendRequest=function(t,e,a,i){if(this.stallion){var o={method:t,path:e,data:a},r=++this.lastMessageId;return i&&(this.requestCallbacks[r]=i),this.stallion.postMessage({messageType:n.default.STALLION_MESSAGE_TYPES.request,messageId:r,request:o},"*"),!0}return!1},t.prototype.onStallionMessage=function(t){if(this.started)if(this.stallion||t.data.messageType!==n.default.STALLION_MESSAGE_TYPES.sync){if(t.data.messageType===n.default.STALLION_MESSAGE_TYPES.response){var e=t.data.messageId,a=this.requestCallbacks[e];a&&(a(t.data.response),delete this.requestCallbacks[e])}}else this.setStallionFromEvent(t),this.stallion&&document.dispatchEvent(new Event("wovnSessionReady"))},t.prototype.startRPC=function(){var t=document.createElement("IFRAME"),e=o.default.c("RailsBridge").jWovnHost.replace(/\/$/,""),a=o.default.tag.getAttribute("key");t.setAttribute("id",n.default.STALLION_IFRAME_ID),t.setAttribute("style","display: none"),t.setAttribute("src",e+"/stallion_loader?token="+a),document.body.appendChild(t)},t.prototype.stopRPC=function(){var t=this.getStallionIframe();t&&t.remove()},t.prototype.setStallionFromEvent=function(t){this.stallion=t.source,this.stallion||("http://test-wovn.io/"===location.origin?this.stallion=window:this.stallion=this.getStallionIframe().contentWindow)},t.prototype.getStallionIframe=function(){return document.getElementById(n.default.STALLION_IFRAME_ID)},t}();e.default=new r},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=a(13);e.RuleResult=n.RuleResult;var i=a(128),o=a(129),r=a(130),s=a(131),u=a(132),l=a(133),d=a(134),c=a(135),h=function(){function t(){this.cacheMarks={},this.langs={ja:i.default,en:o.default,"zh-CHT":r.default,"zh-CHS":u.default,ko:s.default,th:l.default,es:d.default,fr:c.default},this.stationRegExpText=this.sortAndJoin(i.default.stations),this.markerDict={"（一部区間で）":new n.Marker("part_of_section","(?:一部区間で)?"),"（一部列車において）":new n.Marker("part_of_train","(?:一部列車において)?"),"（上り・下り線で）":new n.Marker("both","(?:上り・下り線で)?"),"{num}":new n.Marker("num","(\\d+)"),"{wari}":new n.Marker("wari","(\\d)割程度で"),"（▲～▲間で）":new n.Marker("between","(?:(▲)～(▲)間で)?".replace(/▲/g,this.stationRegExpText),["stations","stations"]),"▲～▲間で":new n.Marker("between","(▲)～(▲)間で".replace(/▲/g,this.stationRegExpText),["stations","stations"]),"●":new n.Marker("time",this.sortAndJoin(i.default.times)),"■":new n.Marker("line",this.sortAndJoin(i.default.lines)),"▲":new n.Marker("station",this.stationRegExpText),"★":new n.Marker("reason",this.sortAndJoin(i.default.reasons)),"○":new n.Marker("kind",this.sortAndJoin(i.default.kinds))},this.markerRegexp=new RegExp("("+Object.keys(this.markerDict).join("|")+")")}return t.prototype.translate=function(t,e,a){var n=this.match(t,a);return n.matched?{translation:this.langs[e].translate(n.index,n),remaining:n.remaining}:null},t.prototype.match=function(t,e){for(var a=this.langs[t].templates.map(function(t,e){return[t,e]}).sort(function(t,e){return e[0].length-t[0].length}),i=0;i<a.length;++i){var o=a[i],r=o[0],s=o[1],u=this.matchTemplate(t,r,e);if(u)return new n.RuleResult(!0,s,u.matches,u.remaining)}return new n.RuleResult(!1,0,[],e)},t.prototype.matchTemplate=function(t,e,a){for(var i=e.split(this.markerRegexp).filter(function(t){return t.length>0}),o=[],r=a,s=0;s<i.length;s++){var u=i[s],l=this.markerDict[u]||new n.Marker(null,u),d=r.match(l.regexp);if(!d)return null;if(l.name){var c=this.createVariableMatch(t,u,l,d);o.push(c)}r=r.slice(d[0].length)}return{matches:o,remaining:r}},t.prototype.createVariableMatch=function(t,e,a,i){var o=this.langs[t],r=this.getIndex(t,a.name,i[0]),s=i.filter(function(t){return t});"time"===a.name&&5===r&&(s[1]=o.daysOfWeek[s[1]]);var u=function(t,e,a){for(var n=Math.min(t.length,e.length),i=[],o=0;o<n;++o)i.push(a(t[o],e[o]));return i}(a.captureNames||[],s.slice(1),function(t,e){return o[t]&&o[t].indexOf(e)});return"reason"!==a.name||137!==r&&138!==r||(u[0]=this.getIndex(t,"line",s[1])),new n.Match(a.name,e,r,s,u)},t.prototype.sortAndJoin=function(t){return 0==t.length?"":"(?:(?:"+t.concat().sort(function(t,e){return e.length-t.length}).join(")|(?:")+"))"},t.prototype.getIndex=function(t,e,a){var n=this.getCandidates(t,e),i=this.getIndexWithoutRegExp(e,a,n);if(i)return i;for(var o=0;o<n.length;o++){var r=n[o];if(a.match("^"+r+"$"))return o}return-1},t.prototype.getIndexWithoutRegExp=function(t,e,a){var n=this.cacheMarks[t];if(!n){n={};for(var i=0;i<a.length;i++)n[a[i]]=i;this.cacheMarks[t]=n}return n[e]},t.prototype.getCandidates=function(t,e){switch(e){case"time":return this.langs[t].times;case"line":return this.langs[t].lines;case"station":return this.langs[t].stations;case"reason":return this.langs[t].reasons;case"kind":return this.langs[t].kinds;case"num":return["(\\d+)"];case"wari":return["(\\d)割程度で"];default:return[]}},t}();e.RuleBaseTranslation=h},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=["東横線","目黒線","田園都市線","大井町線","池上線","東急多摩川線","世田谷線","こどもの国線","みなとみらい線","東急線全線","東急線各線","東急線各線、東急線の一部または全線","みなとみらい線","JR山手線","JR京浜東北線","JR横浜線","JR南武線","JR中央快速線","JR中央・総武各駅停車線","JR東海道線","JR宇都宮線","JR高崎線","JR埼京線","JR川越線","JR横須賀線 ","JR総武快速線","JR相模線","JR首都圏各線","JR根岸線","JR京浜東北・根岸線","JR湘南新宿ライン","JR上野東京ライン","JR青梅線","JR五日市線","JR中央本線","JR東北本線","JR上越線","JR常磐線","JR総武各駅停車線","JR八高線","JR武蔵野線","JR京葉線","JR総武本線","JR成田線","東京メトロ銀座線","東京メトロ丸ノ内線","東京メトロ日比谷線","東京メトロ東西線","東京メトロ千代田線","東京メトロ有楽町線","東京メトロ半蔵門線","東京メトロ南北線","東京メトロ副都心線","東京メトロ全線","小田急小田原線 ","小田急江ノ島線","小田急多摩線","小田急線","都営浅草線","都営三田線","都営新宿線","都営大江戸線","都営地下鉄線","横浜市営地下鉄ブルーライン","横浜市営地下鉄グリーンライン","横浜市営地下鉄全線","京王線","京王井の頭線","京王新線","京王高尾線","京王相模原線","京王競馬場線","京王動物園線","相鉄本線","相鉄いずみ野線","相鉄線","りんかい線","京急本線","京急逗子線","京急空港線","京急大師線","京急久里浜線","京急線","東武スカイツリーライン","東武伊勢崎線","東武日光線","東武東上線","東武全線","西武池袋線","西武有楽町線","西武全線","埼玉高鉄道線","東葉高速線","箱根登山鉄道線","京成線","成田スカイアクセス線","京成電鉄全線","北総線"];e.default={daysOfWeek:{"日":0,"月":1,"火":2,"水":3,"木":4,"金":5,"土":6},times:["(\\d+)時(\\d+)分頃","(\\d+)時以降","(\\d+)月(\\d+)日","(\\d+)月(\\d+)日の夜から(\\d+)月(\\d+)日にかけて","早朝から朝ラッシュ時間帯にかけて","([月火水木金土日])曜日の通勤時間帯","本日","明日","明朝","台風接近時","台風最接近時","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日","1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],statuses:["運転見合わせ","遅れ","ダイヤ乱れ","折り返し運転","運転本数減便","直通運転中止","大幅遅れ","一部列車遅れ","一部列車運休","一部列車遅れ・運休"],reasons:["人身事故","急病人救護","お客さま線路転落","お客さまが列車に触れた","お客さま救護","お客さま同士トラブル","お客さま対応","車内確認","ホーム上安全確認","線路内人立入り","踏切道内人渡り残り","踏切道内自動車立ち往生","踏切道内自動車と接触","踏切道内動物と接触","混雑","一部列車に混雑が集中した","お客さまの荷物が線路に落下した","お客さまの身体がドアに引き込まれた","お客さまの荷物がドアに引き込まれた","迷惑行為","線路内異音確認","踏切道内異音確認","異音確認","車両確認","車両点検","車両故障","ドア確認","ドア点検","ドア故障","車両ガラス破損","車両破損","線路内支障物","線路（レール）破断","道床流出","線路安全確認","線路点検","線路故障","線路内確認・点検","ポイント安全確認","ポイント点検","ポイント故障","鉄道施設の確認・点検","保安装置確認","保安装置点検","保安装置故障","信号確認","信号点検","信号故障","緊急停止信号受信","踏切安全確認","踏切点検","踏切故障","踏切事故","ホームドア確認","ホームドア点検","ホームドア故障","駅設備の確認・点検","アルミ風船浮遊処理","架線に支障物","架線故障","送電確認","停電","電気設備の確認・点検","列車衝突事故","列車脱線事故","列車火災","列車妨害","地震","落雷","台風","低気圧","強風","大雨","雪","積雪","濃霧","土砂崩れ","倒木","沿線火災","構造物の確認・点検","大雨","強風","降雪","大雪","低気圧接近","降雪に伴う、安全運行確保","南岸低気圧接近","台風(\\d+)号接近","大雨や強風","台風の接近による、大雨・強風","車内非常通報ボタンでの通報","非常停止ボタンでの通報","線路内への人の立ち入りが通報された","車内清掃","お客さまが列車に近づいた","車内での迷惑行為","車両に対する悪戯があった","鉄道敷地内への人立ち入り","お客さまの傘が線路に落下した","車両の異音感知","車両不具合","車両の不具合による車両交換","ドアの開扉不具合","窓ガラス破損","車両の窓ガラス破損","車両ドアの不具合","車両の安全確認","線路内への荷物落下","線路への落とし物","線路異音の原因確認","線路内への倒木","線路内発煙","線路内火災","線路陥没","鉄道敷地内での発煙","鉄道敷地内での火災","信号確認","信号設備故障の復旧作業","信号装置故障","信号機故障","列車を緊急に停止させる信号を受信","ポイント装置不具合","ホームドアのセンサー不具合","ホームドアの開閉不具合","設備トラブル","駅設備故障","不審物確認","ホーム柵センサーの不具合","ホーム柵センサー故障","電気設備の不具合","架線が切れた為","架線点検","架線に木の枝が引っ掛かった","駅構内での停電","送電トラブル","乗務員体調不良","乗務員の体調不良が生じた","("+n.join("|")+")からの振替受託","("+n.join("|")+")からの遅れの影響","小動物と接触","支障物と接触","設備トラブル","竜巻発生の影響","強風による速度規制","大雨による速度規制","大雨と強風の影響","降雪による速度規制","凍結による線路確認","台風接近に伴う速度規制","大雪による速度規制","車内異音確認"],lines:n,stations:["渋谷駅","代官山駅","中目黒駅","祐天寺駅","学芸大学駅","都立大学駅","自由が丘駅","田園調布駅","多摩川駅","新丸子駅","武蔵小杉駅","元住吉駅","日吉駅","綱島駅","大倉山駅","菊名駅","妙蓮寺駅","白楽駅","東白楽駅","反町駅","横浜駅","目黒駅","不動前駅","武蔵小山駅","西小山駅","洗足駅","大岡山駅","奥沢駅","田園調布駅","多摩川駅","新丸子駅","武蔵小杉駅","元住吉駅","日吉駅","渋谷駅","池尻大橋駅","三軒茶屋駅","駒沢大学駅","桜新町駅","用賀駅","二子玉川駅","二子新地駅","高津駅","溝の口駅","梶が谷駅","宮崎台駅","宮前平駅","鷺沼駅","たまプラーザ駅","あざみ野駅","江田駅","市が尾駅","藤が丘駅","青葉台駅","田奈駅","長津田駅","つくし野駅","すずかけ台駅","南町田駅","つきみ野駅","中央林間駅","大井町駅","下神明駅","戸越公園駅","中延駅","荏原町駅","旗の台駅","北千束駅","大岡山駅","緑が丘駅","自由が丘駅","九品仏駅","尾山台駅","等々力駅","上野毛駅","二子玉川駅","溝の口駅","五反田駅","大崎広小路駅","戸越銀座駅","荏原中延駅","旗の台駅","長原駅","洗足池駅","石川台駅","雪が谷大塚駅","御嶽山駅","久が原駅","千鳥町駅","池上駅","蓮沼駅","蒲田駅","多摩川駅","沼部駅","鵜の木駅","下丸子駅","武蔵新田駅","矢口渡駅","蒲田駅","三軒茶屋駅","西太子堂駅","若林駅","松陰神社前駅","世田谷駅","上町駅","宮の坂駅","山下駅","松原駅","下高井戸駅","長津田駅","恩田駅","こどもの国駅","新高島駅","みなとみらい駅","馬車道駅","日本大通り駅","元町・中華街駅","東京モノレール","大崎駅","五反田駅","目黒駅","恵比寿駅","渋谷駅","原宿駅","代々木駅","新宿駅","新大久保駅","高田馬場駅","目白駅","池袋駅","大塚駅","巣鴨駅","駒込駅","田端駅","西日暮里駅","日暮里駅","鶯谷駅","上野駅","御徒町駅","秋葉原駅","神田駅","東京駅","有楽町駅","新橋駅","浜松町駅","田町駅","品川駅","大宮駅","さいたま新都心駅","与野駅","北浦和駅","浦和駅","南浦和駅","蕨駅","西川口駅","川口駅","赤羽駅","東十条駅","王子駅","上中里駅","田端駅","西日暮里駅","日暮里駅","鶯谷駅","上野駅","御徒町駅","秋葉原駅","神田駅","東京駅","有楽町駅","新橋駅","浜松町駅","田町駅","品川駅","大井町駅","大森駅","蒲田駅","川崎駅","鶴見駅","新子安駅","東神奈川駅","横浜駅","東神奈川駅","大口駅","菊名駅","新横浜駅","小机駅","鴨居駅","中山駅","十日市場駅","長津田駅","成瀬駅","町田駅","古淵駅","淵野辺駅","矢部駅","相模原駅","橋本駅","相原駅","八王子みなみ野駅","片倉駅","八王子駅","川崎駅","尻手駅","矢向駅","鹿島田駅","平間駅","向河原駅","武蔵小杉駅","武蔵中原駅","武蔵新城駅","武蔵溝ノ口駅","津田山駅","久地駅","宿河原駅","登戸駅","中野島駅","稲田堤駅","矢野口駅","稲城長沼駅","南多摩駅","府中本町駅","分倍河原駅","西府駅","谷保駅","矢川駅","西国立駅","立川駅","八丁畷駅","川崎新町駅","小田栄駅","浜川崎駅","東京駅","神田駅","御茶ノ水駅","四ツ谷駅","新宿駅","中野駅","高円寺駅","阿佐ヶ谷駅","荻窪駅","西荻窪駅","吉祥寺駅","三鷹駅","武蔵境駅","東小金井駅","武蔵小金井駅","国分寺駅","西国分寺駅","国立駅","立川駅","日野駅","豊田駅","八王子駅","西八王子駅","高尾駅","三鷹駅","吉祥寺駅","西荻窪駅","荻窪駅","阿佐ヶ谷駅","高円寺駅","中野駅","東中野駅","大久保駅","新宿駅","代々木駅","千駄ヶ谷駅","信濃町駅","四ツ谷駅","市ヶ谷駅","飯田橋駅","水道橋駅","御茶ノ水駅","秋葉原駅","浅草橋駅","両国駅","錦糸町駅","亀戸駅","平井駅","新小岩駅","小岩駅","市川駅","本八幡駅","下総中山駅","西船橋駅","船橋駅","東船橋駅","津田沼駅","幕張本郷駅","幕張駅","新検見川駅","稲毛駅","西千葉駅","千葉駅","東京駅","新橋駅","品川駅","川崎駅","横浜駅","戸塚駅","大船駅","藤沢駅","辻堂駅","茅ヶ崎駅","平塚駅","大磯駅","二宮駅","国府津駅","鴨宮駅","小田原駅","早川駅","根府川駅","真鶴駅","湯河原駅","熱海駅","函南駅","三島駅","沼津駅","東京駅","上野駅","尾久駅","赤羽駅","浦和駅","さいたま新都心駅","大宮駅","土呂駅","東大宮駅","蓮田駅","白岡駅","新白岡駅","久喜駅","東鷲宮駅","栗橋駅","古河駅","野木駅","間々田駅","小山駅","小金井駅","自治医大駅","石橋駅","雀宮駅","宇都宮駅","岡本駅","宝積寺駅","氏家駅","蒲須坂駅","片岡駅","矢板駅","野崎駅","西那須野駅","那須塩原駅","黒磯駅","東京駅","上野駅","尾久駅","赤羽駅","浦和駅","さいたま新都心駅","大宮駅","宮原駅","上尾駅","北上尾駅","桶川駅","北本駅","鴻巣駅","北鴻巣駅","吹上駅","行田駅","熊谷駅","籠原駅","深谷駅","岡部駅","本庄駅","神保原駅","新町駅","倉賀野駅","高崎駅","高崎問屋町駅","井野駅","新前橋駅","前橋駅","大崎駅","恵比寿駅","渋谷駅","新宿駅","池袋駅","板橋駅","十条駅","赤羽駅","北赤羽駅","浮間舟渡駅","戸田公園駅","戸田駅","北戸田駅","武蔵浦和駅","中浦和駅","南与野駅","与野本町駅","北与野駅","大宮駅","大宮駅","日進駅","西大宮駅","指扇駅","南古谷駅","川越駅","西川越駅","的場駅","笠幡駅","武蔵高萩駅","高麗川駅","東京駅","新橋駅","品川駅","西大井駅","武蔵小杉駅","新川崎駅","横浜駅","保土ヶ谷駅","東戸塚駅","戸塚駅","大船駅","北鎌倉駅","鎌倉駅","逗子駅","東逗子駅","田浦駅","横須賀駅","衣笠駅","久里浜駅","東京駅","新日本橋駅","馬喰町駅","錦糸町駅","新小岩駅","市川駅","船橋駅","津田沼駅","稲毛駅","千葉駅","茅ケ崎駅","北茅ケ崎駅","香川駅","寒川駅","宮山駅","倉見駅","門沢橋駅","社家駅","厚木駅","海老名駅","入谷駅","相武台下駅","下溝駅","原当麻駅","番田駅","上溝駅","南橋本駅","橋本駅","横浜駅","桜木町駅","関内駅","石川町駅","山手駅","根岸駅","磯子駅","新杉田駅","洋光台駅","港南台駅","本郷台駅","大船駅","大宮駅","さいたま新都心駅","与野駅","北浦和駅","浦和駅","南浦和駅","蕨駅","西川口駅","川口駅","赤羽駅","東十条駅","王子駅","上中里駅","田端駅","西日暮里駅","日暮里駅","鶯谷駅","上野駅","御徒町駅","秋葉原駅","神田駅","東京駅","有楽町駅","新橋駅","浜松町駅","田町駅","品川駅","大井町駅","大森駅","蒲田駅","川崎駅","鶴見駅","新子安駅","東神奈川駅","横浜駅","桜木町駅","関内駅","石川町駅","山手駅","根岸駅","磯子駅","新杉田駅","洋光台駅","港南台駅","本郷台駅","大船駅","品川駅","新橋駅","東京駅","上野駅","日暮里駅","三河島駅","南千住駅","北千住駅","松戸駅","柏駅","我孫子駅","天王台駅","取手駅","藤代駅","佐貫駅","牛久駅","ひたち野うしく駅","荒川沖駅","土浦駅","新宿駅","池袋駅","赤羽駅","浦和駅","大宮駅","土呂駅","東大宮駅","蓮田駅","白岡駅","新白岡駅","久喜駅","東鷲宮駅","栗橋駅","古河駅","野木駅","間々田駅","小山駅","小金井駅","自治医大駅","石橋駅","雀宮駅","宇都宮駅","新宿駅","池袋駅","赤羽駅","浦和駅","大宮駅","宮原駅","上尾駅","北上尾駅","桶川駅","北本駅","鴻巣駅","北鴻巣駅","吹上駅","行田駅","熊谷駅","籠原駅","深谷駅","岡部駅","本庄駅","神保原駅","新町駅","倉賀野駅","高崎駅","高崎問屋町駅","井野駅","新前橋駅","前橋駅","新宿駅","渋谷駅","恵比寿駅","大崎駅","西大井駅","武蔵小杉駅","新川崎駅","横浜駅","保土ケ谷駅","東戸塚駅","戸塚駅","大船駅","北鎌倉駅","鎌倉駅","逗子駅","新宿駅","渋谷駅","恵比寿駅","大崎駅","西大井駅","武蔵小杉駅","新川崎駅","横浜駅","保土ケ谷駅","東戸塚駅","戸塚駅","大船駅","藤沢駅","辻堂駅","茅ケ崎駅","平塚駅","大磯駅","二宮駅","国府津駅","鴨宮駅","小田原駅","東京駅","上野駅","尾久駅","赤羽駅","浦和駅","さいたま新都心駅","大宮駅","土呂駅","東大宮駅","蓮田駅","白岡駅","新白岡駅","久喜駅","東鷲宮駅","栗橋駅","古河駅","野木駅","間々田駅","小山駅","小金井駅","自治医大駅","石橋駅","雀宮駅","宇都宮駅","岡本駅","宝積寺駅","氏家駅","蒲須坂駅","片岡駅","矢板駅","野崎駅","西那須野駅","那須塩原駅","黒磯駅","東京駅","上野駅","尾久駅","赤羽駅","浦和駅","さいたま新都心駅","大宮駅","宮原駅","上尾駅","北上尾駅","桶川駅","北本駅","鴻巣駅","北鴻巣駅","吹上駅","行田駅","熊谷駅","籠原駅","深谷駅","岡部駅","本庄駅","神保原駅","新町駅","倉賀野駅","高崎駅","高崎問屋町駅","井野駅","新前橋駅","前橋駅","東京駅","新橋駅","品川駅","川崎駅","横浜駅","戸塚駅","大船駅","藤沢駅","辻堂駅","茅ヶ崎駅","平塚駅","大磯駅","二宮駅","国府津駅","鴨宮駅","小田原駅","早川駅","根府川駅","真鶴駅","湯河原駅","熱海駅","函南駅","三島駅","沼津駅","品川駅","新橋駅","東京駅","上野駅","日暮里駅","三河島駅","南千住駅","北千住駅","松戸駅","柏駅","我孫子駅","天王台駅","取手駅","藤代駅","佐貫駅","牛久駅","ひたち野うしく駅","荒川沖駅","土浦駅","渋谷駅","表参道駅","外苑前駅","青山一丁目駅","赤坂見附駅","溜池山王駅","虎ノ門駅","新橋駅","銀座駅","京橋駅","日本橋駅","三越前駅","神田駅","末広町駅","上野広小路駅","上野駅","稲荷町駅","田原町駅","浅草駅","荻窪駅","南阿佐ケ谷駅","新高円寺駅","東高円寺駅","新中野駅","中野坂上駅","西新宿駅","新宿駅","新宿三丁目駅","新宿御苑前駅","四谷三丁目駅","四ツ谷駅","赤坂見附駅","国会議事堂前駅","霞ケ関駅","銀座駅","東京駅","大手町駅","淡路町駅","御茶ノ水駅","本郷三丁目駅","後楽園駅","茗荷谷駅","新大塚駅","池袋駅","方南町駅","中野富士見町駅","中野新橋駅","中目黒駅","恵比寿駅","広尾駅","六本木駅","神谷町駅","霞ケ関駅","日比谷駅","銀座駅","東銀座駅","築地駅","八丁堀駅","茅場町駅","人形町駅","小伝馬町駅","秋葉原駅","仲御徒町駅","上野駅","入谷駅","三ノ輪駅","南千住駅","北千住駅","中野駅","落合駅","高田馬場駅","早稲田駅","神楽坂駅","飯田橋駅","九段下駅","竹橋駅","大手町駅","日本橋駅","茅場町駅","門前仲町駅","木場駅","東陽町駅","南砂町駅","西葛西駅","葛西駅","浦安駅","南行徳駅","行徳駅","妙典駅","原木中山駅","西船橋駅","代々木上原駅","代々木公園駅","明治神宮前駅","表参道駅","乃木坂駅","赤坂駅","国会議事堂前駅","霞ケ関駅","日比谷駅","二重橋前駅","大手町駅","新御茶ノ水駅","湯島駅","根津駅","千駄木駅","西日暮里駅","町屋駅","北千住駅","綾瀬駅","北綾瀬駅","和光市駅","地下鉄成増駅","地下鉄赤塚駅","平和台駅","氷川台駅","小竹向原駅","千川駅","要町駅","池袋駅","東池袋駅","護国寺駅","江戸川橋駅","飯田橋駅","市ケ谷駅","麹町駅","永田町駅","桜田門駅","有楽町駅","銀座一丁目駅","新富町駅","月島駅","豊洲駅","辰巳駅","新木場駅","渋谷駅","表参道駅","青山一丁目駅","永田町駅","半蔵門駅","九段下駅","神保町駅","大手町駅","三越前駅","水天宮前駅","清澄白河駅","住吉駅","錦糸町駅","押上\\(スカイツリー前\\)駅","目黒駅","白金台駅","白金高輪駅","麻布十番駅","六本木一丁目駅","溜池山王駅","永田町駅","四ツ谷駅","市ケ谷駅","飯田橋駅","後楽園駅","東大前駅","本駒込駅","駒込駅","西ケ原駅","王子駅","王子神谷駅","志茂駅","赤羽岩淵駅","和光市駅","地下鉄成増駅","地下鉄赤塚駅","平和台駅","氷川台駅","小竹向原駅","千川駅","要町駅","池袋駅","雑司が谷駅","西早稲田駅","東新宿駅","新宿三丁目駅","北参道駅","明治神宮前駅","渋谷駅","新宿駅","南新宿駅","参宮橋駅","代々木八幡駅","代々木上原駅","東北沢駅","下北沢駅","世田谷代田駅","梅ヶ丘駅","豪徳寺駅","経堂駅","千歳船橋駅","祖師ヶ谷大蔵駅","成城学園前駅","喜多見駅","狛江駅","和泉多摩川駅","登戸駅","向ヶ丘遊園駅","生田駅","読売ランド前駅","百合ヶ丘駅","新百合ヶ丘駅","柿生駅","鶴川駅","玉川学園前駅","町田駅","相模大野駅","小田急相模原駅","相武台前駅","座間駅","海老名駅","厚木駅","本厚木駅","愛甲石田駅","伊勢原駅","鶴巻温泉駅","東海大学前駅","秦野駅","渋沢駅","新松田駅","開成駅","栢山駅","富水駅","螢田駅","足柄駅","小田原駅","相模大野駅","東林間駅","中央林間駅","南林間駅","鶴間駅","大和駅","桜ヶ丘駅","高座渋谷駅","長後駅","湘南台駅","六会日大前駅","善行駅","藤沢本町駅","藤沢駅","本鵠沼駅","鵠沼海岸駅","片瀬江ノ島駅","新百合ヶ丘駅","五月台駅","栗平駅","黒川駅","はるひ野駅","小田急永山駅","小田急多摩センター駅","唐木田駅","押上\\(スカイツリー前\\)駅","本所吾妻橋駅","浅草駅","蔵前駅","浅草橋駅","東日本橋駅","人形町駅","日本橋駅","宝町駅","東銀座駅","新橋駅","大門駅","三田駅","泉岳寺駅","高輪台駅","五反田駅","戸越駅","中延駅","馬込駅","西馬込駅","目黒駅","白金台駅","白金高輪駅","三田駅","芝公園駅","御成門駅","内幸町駅","日比谷駅","大手町駅","神保町駅","水道橋駅","春日駅","白山駅","千石駅","巣鴨駅","西巣鴨駅","新板橋駅","板橋区役所前駅","板橋本町駅","本蓮沼駅","志村坂上駅","志村三丁目駅","蓮根駅","西台駅","高島平駅","新高島平駅","西高島平駅","新宿駅","新宿三丁目駅","曙橋駅","市ケ谷駅","九段下駅","神保町駅","小川町駅","岩本町駅","馬喰横山駅","浜町駅","森下駅","菊川駅","住吉駅","西大島駅","大島駅","東大島駅","船堀駅","一之江駅","瑞江駅","篠崎駅","本八幡駅","光が丘駅","練馬春日町駅","豊島園駅","練馬駅","新江古田駅","落合南長崎駅","中井駅","東中野駅","中野坂上駅","西新宿五丁目駅","都庁前駅","新宿駅","代々木駅","国立競技場駅","青山一丁目駅","六本木駅","麻布十番駅","赤羽橋駅","大門駅","汐留駅","築地市場駅","勝どき駅","月島駅","門前仲町駅","清澄白河駅","森下駅","両国駅","蔵前駅","新御徒町駅","上野御徒町駅","本郷三丁目駅","春日駅","飯田橋駅","牛込神楽坂駅","牛込柳町駅","若松河田駅","東新宿駅","新宿西口駅","あざみ野駅","中川駅","センター北駅","センター南駅","仲町台駅","新羽駅","北新横浜駅","新横浜駅","岸根公園駅","片倉町駅","三ツ沢上町駅","三ツ沢下町駅","横浜駅","高島町駅","桜木町駅","関内駅","伊勢佐木長者町駅","阪東橋駅","吉野町駅","蒔田駅","弘明寺駅","上大岡駅","港南中央駅","上永谷駅","下永谷駅","舞岡駅","戸塚駅","踊場駅","中田駅","立場駅","下飯田駅","湘南台駅","日吉駅","日吉本町駅","高田駅","東山田駅","北山田駅","センター北駅","センター南駅","都筑ふれあいの丘駅","川和町駅","中山駅","新宿駅","笹塚駅","代田橋駅","明大前駅","下高井戸駅","桜上水駅","上北沢駅","八幡山駅","芦花公園駅","千歳烏山駅","仙川駅","つつじヶ丘駅","柴崎駅","国領駅","布田駅","調布駅","西調布駅","飛田給駅","武蔵野台駅","多磨霊園駅","東府中駅","府中駅","分倍河原駅","中河原駅","聖蹟桜ヶ丘駅","百草園駅","高幡不動駅","南平駅","平山城址公園駅","長沼駅","北野駅","京王八王子駅","渋谷駅","神泉駅","駒場東大前駅","池ノ上駅","下北沢駅","新代田駅","東松原駅","明大前駅","永福町駅","西永福駅","浜田山駅","高井戸駅","富士見ヶ丘駅","久我山駅","三鷹台駅","井の頭公園駅","吉祥寺駅","新宿駅","初台駅","幡ヶ谷駅","笹塚駅","北野駅","京王片倉駅","山田駅","めじろ台駅","狭間駅","高尾駅","高尾山口駅","調布駅","京王多摩川駅","京王稲田堤駅","京王よみうりランド駅","稲城駅","若葉台駅","京王永山駅","京王多摩センター駅","京王堀之内駅","南大沢駅","多摩境駅","橋本駅","東府中駅","府中競馬正門前駅","高幡不動駅","多摩動物公園駅","横浜駅","平沼橋駅","西横浜駅","天王町駅","星川駅","和田町駅","上星川駅","西谷駅","鶴ヶ峰駅","二俣川駅","希望ヶ丘駅","三ツ境駅","瀬谷駅","大和駅","相模大塚駅","さがみ野駅","かしわ台駅","海老名駅","二俣川駅","南万騎が原駅","緑園都市駅","弥生台駅","いずみ野駅","いずみ中央駅","ゆめが丘駅","湘南台駅","新木場駅","東雲駅","国際展示場駅","東京テレポート駅","天王洲アイル駅","品川シーサイド駅","大井町駅","大崎駅","泉岳寺駅","品川駅","北品川駅","新馬場駅","青物横丁駅","鮫洲駅","立会川駅","大森海岸駅","平和島駅","大森町駅","梅屋敷駅","京急蒲田駅","雑色駅","六郷土手駅","京急川崎駅","八丁畷駅","鶴見市場駅","京急鶴見駅","花月園前駅","生麦駅","京急新子安駅","子安駅","神奈川新町駅","仲木戸駅","神奈川駅","横浜駅","戸部駅","日ノ出町駅","黄金町駅","南太田駅","井土ヶ谷駅","弘明寺駅","上大岡駅","屏風浦駅","杉田駅","京急富岡駅","能見台駅","金沢文庫駅","金沢八景駅","追浜駅","京急田浦駅","安針塚駅","逸見駅","汐入駅","横須賀中央駅","県立大学駅","堀ノ内駅","京急大津駅","馬堀海岸駅","浦賀駅","金沢八景駅","六浦駅","神武寺駅","新逗子駅","京急蒲田駅","糀谷駅","大鳥居駅","穴守稲荷駅","天空橋駅","羽田空港国際線ターミナル駅","羽田空港国内線ターミナル駅","京急川崎駅","港町駅","鈴木町駅","川崎大師駅","東門前駅","産業道路駅","小島新田駅","堀ノ内駅","新大津駅","北久里浜駅","京急久里浜駅","YRP野比駅","京急長沢駅","津久井浜駅","三浦海岸駅","三崎口駅","浅草駅","とうきょうスカイツリー駅","押上\\(スカイツリー前\\)駅","曳舟駅","東向島駅","鐘ヶ淵駅","堀切駅","牛田駅","北千住駅","小菅駅","五反野駅","梅島駅","西新井駅","竹ノ塚駅","谷塚駅","草加駅","獨協大学前<草加松原>駅","新田駅","蒲生駅","新越谷駅","越谷駅","北越谷駅","大袋駅","せんげん台駅","武里駅","一ノ割駅","春日部駅","北春日部駅","姫宮駅","東武動物公園駅","東武動物公園駅","和戸駅","久喜駅","東武動物公園駅","杉戸高野台駅","幸手駅","南栗橋駅","栗橋駅","新古河駅","柳生駅","板倉東洋大前駅","藤岡駅","静和駅","新大平下駅","栃木駅","新栃木駅","合戦場駅","家中駅","東武金崎駅","楡木駅","樅山駅","新鹿沼駅","北鹿沼駅","板荷駅","下小代駅","明神駅","下今市駅","上今市駅","東武日光駅","池袋駅","北池袋駅","下板橋駅","大山駅","中板橋駅","ときわ台駅","上板橋駅","東武練馬駅","下赤塚駅","成増駅","和光市駅","朝霞駅","朝霞台駅","志木駅","柳瀬川駅","みずほ台駅","鶴瀬駅","ふじみ野駅","上福岡駅","新河岸駅","川越駅","川越市駅","霞ヶ関駅","鶴ヶ島駅","若葉駅","坂戸駅","北坂戸駅","高坂駅","東松山駅","森林公園駅","つきのわ駅","武蔵嵐山駅","小川町駅","東武竹沢駅","男衾駅","鉢形駅","玉淀駅","寄居駅","池袋駅","椎名町駅","東長崎駅","江古田駅","桜台駅","練馬駅","中村橋駅","富士見台駅","練馬高野台駅","石神井公園駅","大泉学園駅","保谷駅","ひばりヶ丘駅","東久留米駅","清瀬駅","秋津駅","所沢駅","西所沢駅","小手指駅","狭山ヶ丘駅","武蔵藤沢駅","稲荷山公園駅","入間市駅","仏子駅","元加治駅","飯能駅","東飯能駅","高麗駅","武蔵横手駅","東吾野駅","吾野駅","小竹向原駅","新桜台駅","練馬駅","赤羽岩淵駅","川口元郷駅","南鳩ヶ谷駅","鳩ヶ谷駅","新井宿駅","戸塚安行駅","東川口駅","浦和美園駅"],alternatives:["JR線","東京メトロ","小田急線","横浜市営地下鉄","京浜急行","相鉄線","京王線","横浜臨海高速鉄道りんかい線","都営地下鉄","ＪＲ（横浜線・南武線）の一部区間","東急バス","横浜市営バス","小田急バス","神奈中バス"],kinds:["各停","急行","準急","通勤快速","特急"],templates:["■は、●、▲での★のため、（▲～▲間で）運転を見合わせております。","運転再開は●の見込みです。","ご迷惑をおかけして申し訳ございません。?","■は、●、▲での★の影響により、▲～▲間で折り返し運転を行っています。","振替輸送を実施しています。","運転再開見込み時刻は●でしたが、★のため、●の見込みに変更いたします。","■は、●、▲での★の影響により、（▲～▲間で）運転を見合わせております。","なお、現在専門の係員が原因の調査を行っており、運転再開見込み時刻は●お知らせする予定です。","迂回乗車をお願いします。","■は、●、▲での★のため、（▲～▲間で）運転を見合わせております。","■は、●、▲での★の影響により、（一部区間で）運転を見合わせていましたが、●、運転を再開しました。","なお、現在遅れが発生しています。","お急ぎの方は迂回乗車をお願いします。","■は、●、▲での★の影響により、（一部区間で）運転を見合わせていましたが、●、全列車各駅停車で運転を再開しました。","なお、現在ダイヤが乱れています。","■は、●、▲での★の影響により、大幅に遅れており所要時間の増加が発生しています。","■は、●、▲での★の影響により、（一部列車において）遅れが発生しています。","■は、●、▲での★の影響により、一部列車に運休が発生しています。","■は、上り線で遅れが発生しています。","■は、下り線で遅れが発生しています。","■は、上下線で遅れが発生しています。","なお、所要時分は概ね平常どおりです。","■は、★の影響により★による運転が見込まれます。","列車の大幅な遅れや所要時間の増加にともない、駅や車内では大変混雑することが予想されます。","お客さまには大変ご迷惑をお掛けします。","お出掛けを控えていただきますよう、ご理解をお願いします。","■は、★の影響により通常の{wari}運転をしています。","■は、★の影響によりダイヤが乱れていますが、所要時分は概ね平常どおりです。","■ ▲は、★の影響による混雑により、●現在入場規制を行っています。","★の影響により、●、安全確保のため■において、運転見合わせや遅れが発生する可能性がございます。","ご利用の際はご注意ください。","日頃より東急線をご利用いただき誠にありがとうございます。","★の影響により、●、★が予想されております。","安全運行確保のため、■において、運転見合わせや運転速度を落とした運行となる場合があり、通常よりも所要時間が多くかかる可能性がございます。","お客さまにはご迷惑をお掛けしますが、お時間に余裕をもってお出掛けください。","特に●は、可能な限りお出掛けをお控えくださいますようお願いいたします。","安全運行確保のため、■において、運転を取りやめる可能性がございます。","また、●には全線で運転本数を減らして運行するため、所要時間が多くかかることが見込まれます。","お客さまにはご迷惑をお掛けしますが、特に●には、可能な限りお出掛けをお控えくださいますようお願いいたします。","★の影響により、●、安全確保のため■において、運転を順次取りやめます。","★に伴い、安全運行確保のため、■において、終電を繰り上げ●順次運転を取りやめます。","お客さまにはご迷惑をお掛けしますが、何卒ご理解の程よろしくお願いいたします。","天候状況によってはそれより前に運休になる可能性がございます。","■は、★の影響により、運転本数を減らして運行しております。","また、■は●を目途に運転を終了いたします。","振替輸送を実施しています。","■は、▲を●に発車する、○・▲行きの電車が、終電車となります。","■は、★の影響により、運転を終了致しました。","ご迷惑をおかけいたしますこと、お詫び申し上げます。","振替は、■、■、■などで実施しています。","なお、鉄道各社の振替輸送は実施しておりません。","なお、振替輸送は、■を含む定期券、きっぷ、回数券をお持ちのお客さまにご利用いただけます。","ICカードのチャージ額（残額）によるご利用は、大変申し訳ございませんが、振替輸送対象外となりますことをご承知おきください。","一部駅ではホーム上が大変混雑しております。","安全を確保するために駅改札口で入場規制を行っています。","Ｓ－ＴＲＡＩＮ{num}号は運休しております。","またＱ－ＳＥＡＴ{num}号は、運休の為サービスを中止いたします。","運行情報","東急各線は、平常通り運転しています。","列車の運行に15分以上の遅れ・運転見合わせが発生または見込まれる場合に運行情報をお知らせしております。","路線名","駅入場規制情報","東横線は、平常通り運転しています。","目黒線は、平常通り運転しています。","田園都市線は、平常通り運転しています。","大井町線は、平常通り運転しています。","池上線は、平常通り運転しています。","東急多摩川線は、平常通り運転しています。","世田谷線は、平常通り運転しています。","こどもの国線は、平常通り運転しています。","日頃より東急線をご利用いただき誠にありがとうございます。","現在、運行情報の表示に不具合が発生しております。","お客さまにはご迷惑をお掛けしますが、何卒ご理解の程よろしくお願いいたします。","ご迷惑をおかけいたします。","お詫び申し上げます。"],oldTemplates:["●、■は、▲での★のため、（▲～▲間で）運転を見合わせております。運転再開は●の見込みです。ご迷惑をおかけして申し訳ございません","●、■は、▲での★の影響により、▲～▲間で折り返し運転を行っています。運転再開は●の見込みです。振替輸送を実施しています。ご迷惑をおかけして申し訳ございません。","●、■は、▲での★の影響により、▲～▲間で折り返し運転を行っています。運転再開見込み時刻は●でしたが、★のため、●の見込みに変更いたします。振替輸送を実施しています。ご迷惑をおかけして申し訳ございません。","●、■は▲での★の影響により、（▲～▲間で）運転を見合わせております。なお、現在専門の係員が原因の調査を行っており、運転再開見込み時刻は●お知らせする予定です。迂回乗車をお願いします。ご迷惑をおかけして申し訳ございません。","●、■は、▲での★のため、（▲～▲間で）運転を見合わせております。なお、現在専門の係員が原因の調査を行っており、運転再開見込み時刻は●お知らせする予定です。迂回乗車をお願いします。振替輸送を実施しています。ご迷惑をおかけして申し訳ございません。","●、■は、▲での★の影響により、（一部区間で）運転を見合わせていましたが、●、運転を再開しました。なお、現在遅れが発生しています。（お急ぎの方は迂回乗車をお願いします。）振替輸送を実施しています。ご迷惑をおかけして申し訳ございません。","●、■は、▲での★の影響により、（一部区間で）運転を見合わせていましたが、●、全列車各駅停車で運転を再開しました。なお、現在ダイヤが乱れています。振替輸送を実施しています。ご迷惑をおかけして申し訳ございません。","●、■は、▲での★の影響により、大幅に遅れており所要時間の増加が発生しています。お急ぎの方は迂回乗車をお願いします。振替輸送を実施しています。ご迷惑をおかけして申し訳ございません。","●、■は、▲での★の影響により、（一部列車において）遅れが発生しています。（振替輸送を実施しています。）ご迷惑をおかけして申し訳ございません。","●、■は、▲での★の影響により、一部列車に運休が発生しています。（振替輸送を実施しています。）ご迷惑をおかけして申し訳ございません。","■は、（上り・下り線で）遅れが発生しています。なお、所要時分は概ね平常どおりです。（振替輸送を実施しています。）","■は、★の影響により★による運転が見込まれます。列車の大幅な遅れや所要時間の増加にともない、駅や車内では大変混雑することが予想されます。お客さまには大変ご迷惑をお掛けします。お出掛けを控えていただきますよう、ご理解をお願いします。","■は、★の影響により通常の{wari}運転をしています。列車の大幅な遅れや所要時間の増加にともない、駅や車内では大変混雑することが予想されます。お客さまには大変ご迷惑をお掛けします。お出掛けを控えていただきますよう、ご理解をお願いします。","■は、★の影響によりダイヤが乱れていますが、所要時分は概ね平常どおりです。ご迷惑をおかけして申し訳ございません。","■▲は、★の影響による混雑により、●現在入場規制を行っています。お客さまには大変ご迷惑をお掛けします。お出掛けを控えていただきますよう、ご理解をお願いします。","振替は、■、■、■などで実施しています。","なお、鉄道各社の振替輸送は実施しておりません。","なお、振替輸送は、■を含む定期券、きっぷ、回数券をお持ちのお客さまにご利用いただけます。ICカードのチャージ額（残額）によるご利用は、大変申し訳ございませんが、振替輸送対象外となりますことをご承知おきください。","一部駅ではホーム上が大変混雑しております。安全を確保するために駅改札口で入場規制を行っています。","Ｓ－ＴＲＡＩＮ{num}号は運休しております。","またＱ－ＳＥＡＴ{num}号は、運休の為サービスを中止いたします。","★の影響により、●、安全確保のため■において、運転見合わせや遅れが発生する可能性がございます。ご利用の際はご注意ください。","日頃より東急線をご利用いただき誠にありがとうございます。★の影響により、●、★が予想されております。安全運行確保のため、■において、運転見合わせや運転速度を落とした運行となる場合があり、通常よりも所要時間が多くかかる可能性がございます。お客さまにはご迷惑をお掛けしますが、お時間に余裕をもってお出掛けください。特に●は、可能な限りお出掛けをお控えくださいますようお願いいたします。","日頃より東急線をご利用いただき誠にありがとうございます。★の影響により、●、★が予想されております。安全運行確保のため、■において、運転を取りやめる可能性がございます。また、●には全線で運転本数を減らして運行するため、所要時間が多くかかることが見込まれます。お客さまにはご迷惑をお掛けしますが、特に●には、可能な限りお出掛けをお控えくださいますようお願いいたします。","★の影響により、●、安全確保のため■において、運転を順次取りやめます。ご利用の際はご注意ください。","日頃より東急線をご利用いただき誠にありがとうございます。★に伴い、安全運行確保のため、■において、終電を繰り上げ●順次運転を取りやめます。お客さまにはご迷惑をお掛けしますが、何卒ご理解の程よろしくお願いいたします。","天候状況によってはそれより前に運休になる可能性がございます。","■は、★の影響により、運転本数を減らして運行しております。また、■は●を目途に運転を終了いたします。振替輸送を実施しています。ご迷惑をおかけいたしますこと、お詫び申し上げます。","■は、▲を●に発車する、○・▲行きの電車が、終電車となります。","■は、★の影響により、運転を終了致しました。ご迷惑をおかけいたしますこと、お詫び申し上げます。","運行情報","東急各線は、平常通り運転しています。","列車の運行に15分以上の遅れ・運転見合わせが発生または見込まれる場合に運行情報をお知らせしております。","路線名","駅入場規制情報","東横線は、平常通り運転しています。","目黒線は、平常通り運転しています。","田園都市線は、平常通り運転しています。","大井町線は、平常通り運転しています。","池上線は、平常通り運転しています。","東急多摩川線は、平常通り運転しています。","世田谷線は、平常通り運転しています。","こどもの国線は、平常通り運転しています。","日頃より東急線をご利用いただき誠にありがとうございます。現在、運行情報の表示に不具合が発生しております。お客さまにはご迷惑をお掛けしますが、何卒ご理解の程よろしくお願いいたします。"]}},function(t,e,a){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var a in e)e.hasOwnProperty(a)&&(t[a]=e[a])};return function(e,a){function n(){this.constructor=e}t(e,a),e.prototype=null===a?Object.create(a):(n.prototype=a.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.markMap={between:new RegExp(" \\(?between ▲ and ▲\\)?")},e.fixedTranslations={detour:"Passengers in a hurry are requested to travel via an alternative route.",part_of_section:"in some sections",part_of_train:"in some sections",both:"both inbound and outbound",alternative:"Passengers may use our replacement services."},e.daysOfWeek=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],e.months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],e.translations={num:["\\1"],wari:["\\10%"],kind:["local train","express train","semi express train","commuter express train","limited express train"],time:["at approximately \\1:\\2","after \\1:00",null,null,"from early morning through the morning rush hour",null,"today","tomorrow","tomorrow morning","when a typhoon is approaching","when a typhoon is very close","on Monday","on Tuesday","on Wednesday","on Thursday","on Friday","on Saturday","on Sunday","in Jan.","in Feb.","in Mar.","in Apr.","in May.","in Jun.","in Jul.","in Aug.","in Sep.","in Oct.","in Nov.","in Dec."],line:["the Tōyoko Line","the Meguro Line","the Den-en-toshi Line","the Ōimachi Line","the Ikegami Line","the Tōkyū Tamagawa Line","the Setagaya Line","the Kodomonokuni Line","the Minatomirai Line","all Tokyu lines","all Tokyu lines","some or all Tokyu lines","the Minatomirai Line","the JR Yamanote Line","the JR Keihin-tōhoku Line","the JR Yokohama Line","the JR Nambu Line","the JR Chūō Line (Rapid service)","the JR Chūō Line,Sōbu Line (Local Train)","the JR Tōkaidō Line","the JR Utsunomiya Line","the JR Takasaki Line","the JR Saikyō Line","the JR Kawagoe Line","the JR Yokosuka Line","the JR Sōbu Line (Rapid)","the JR Sagami Line","the JR Lines in Greater Tokyo","the JR Negishi Line","the JR Keihin-tōhoku Line・Negishi Line","the JR Shōnan-Shinjuku Line","the JR Ueno-Tōkyō Line","the JR Ōme Line","the JR Itsukaichi Line","the JR Chūō Line","the JR Tōhoku Line","the JR Jōetsu Line","the JR Jōban Line","the JR Sōbu Line (Local Train)","the Hachikō Line","the Musashino Line","the Keiyō Line","the Sōbu Line","the Narita Line","the Ginza Line","the Marunouchi Line","the Hibiya Line","the Tōzai Line","the Chiyoda Line","the Yūrakuchō Line","the Hanzōmon Line","the Namboku Line","the Fukutoshin Line","all Tokyo Metro Line","the Odakyū Odawara Line","the Odakyū Enoshima Line","the Odakyū Tama Line","the Odakyū Line","the Toei Asakusa Line","the Toei Mita Line","the Toei Shinjuku Line","the Toei Ōedo Line","the Toei Line","the Yokohama Municipal Subway (Blue Line)","the Yokohama Municipal Subway (Green Line)","all Yokohama Municipal Subway","the Keiō Line","the Keiō Inokashira Line","the Keiō Line","the Keiō Takao Line","the Keiō Sagamihara Line","the Keiō Keibajō Line","the Keiō Dōbutsuen Line","the Sotetsu Main Line","the Sotetsu Izumino Line","the Sotetsu Line","the Rinkai Line","the Keikyū Line","the Keikyū Zushi Line","the Keikyū Kūkō Line","the Keikyū Daishi Line","the Keikyū Kurihama Line","the Keikyū Line","the TOBU SKYTREE Line","the Tōbu Isesaki Line","the Tōbu Nikkō Line","the Tōbu Tōjō Line","all Tōbu Line","the Seibu Ikebukuro Line","the Seibu Yūrakuchō Line","all Seibu Line","the Saitama Railway Line","the Toyo Rapid Line","the Hakone Tozan Railway Line","the Keisei Line","the Narita SKY ACCESS Line","all Keisei Line","the Hokuso Line"],station:["Shibuya Station","Daikan-yama Station","Naka-meguro Station","Yūtenji Station","Gakugei-daigaku Station","Toritsu-daigaku Station","Jiyūgaoka Station","Den-en-chōfu Station","Tamagawa Station","Shin-maruko Station","Musashi-kosugi Station","Motosumiyoshi Station","Hiyoshi Station","Tsunashima Station","Ōkurayama Station","Kikuna Station","Myōrenji Station","Hakuraku Station","Higashi-hakuraku Station","Tammachi Station","Yokohama Station","Meguro Station","Fudō-mae Station","Musashi-koyama Station","Nishi-koyama Station","Senzoku Station","Ōokayama Station","Okusawa Station","Den-en-chōfu Station","Tamagawa Station","Shin-maruko Station","Musashi-kosugi Station","Motosumiyoshi Station","Hiyoshi Station","Shibuya Station","Ikejiri-ōhashi Station","Sangen-jaya Station","Komazawa-daigaku Station","Sakura-shimmachi Station","Yōga Station","Futako-tamagawa Station","Futako-shinchi Station","Takatsu Station","Mizonokuchi Station","Kajigaya Station","Miyazakidai Station","Miyamaedaira Station","Saginuma Station","Tama-plaza Station","Azamino Station","Eda Station","Ichigao Station","Fujigaoka Station","Aobadai Station","Tana Station","Nagatsuta Station","Tsukushino Station","Suzukakedai Station","Minami-machida Station","Tsukimino Station","Chūō-rinkan Station","Ōimachi Station","Shimo-shimmei Station","Togoshi-kōen Station","Nakanobu Station","Ebara-machi Station","Hatanodai Station","Kita-senzoku Station","Ōokayama Station","Midorigaoka Station","Jiyūgaoka Station","Kuhombutsu Station","Oyamadai Station","Todoroki Station","Kaminoge Station","Futako-tamagawa Station","Mizonokuchi Station","Gotanda Station","Ōsakihirokōji Station","Togoshi-ginza Station","Ebara-nakanobu Station","Hatanodai Station","Nagahara Station","Senzoku-ike Station","Ishikawa-dai Station","Yukigaya-ōtsuka Station","Ontakesan Station","Kugahara Station","Chidorichō Station","Ikegami Station","Hasunuma Station","Kamata Station","Tamagawa Station","Numabe Station","Unoki Station","Shimomaruko Station","Musashi-nitta Station","Yaguchi-no-watashi Station","Kamata Station","Sangen-jaya Station","Nishi-taishidō Station","Wakabayashi Station","Shōin-jinja-mae Station","Setagaya Station","Kamimachi Station","Miyanosaka Station","Yamashita Station","Matsubara Station","Shimo-takaido Station","Nagatsuta Station","Onda Station","Kodomonokuni Station","Shin-takashima Station","Minatomirai Station","Bashamichi Station","Nihon-ōdōri Station","Motomachi-Chūkagai Station","the Tokyo Monorail","Ōsaki Station","Gotanda Station","Meguro Station","Ebisu Station","Shibuya Station","Harajuku Station","Yoyogi Station","Shinjuku Station","Shin-Ōkubo Station","Takadanobaba Station","Mejiro Station","Ikebukuro Station","Ōtsuka Station","Sugamo Station","Komagome Station","Tabata Station","Nishi-Nippori Station","Nippori Station","Uguisudani Station","Ueno Station","Okachimachi Station","Akihabara Station","Kanda Station","Tōkyō Station","Yūrakuchō Station","Shimbashi Station","Hamamatsuchō Station","Tamachi Station","Shinagawa Station","Ōmiya Station","Saitama-Shintoshin Station","Yono Station","Kita-Urawa Station","Urawa Station","Minami-Urawa Station","Warabi Station","Nishi-Kawaguchi Station","Kawaguchi Station","Akabane Station","Higashi-Jūjō Station","Ōji Station","Kami-Nakazato Station","Tabata Station","Nishi-Nippori Station","Nippori Station","Uguisudani Station","Ueno Station","Okachimachi Station","Akihabara Station","Kanda Station","Tōkyō Station","Yūrakuchō Station","Shimbashi Station","Hamamatsuchō Station","Tamachi Station","Shinagawa Station","Ōimachi Station","Ōmori Station","Kamata Station","Kawasaki Station","Tsurumi Station","Shin-Koyasu Station","Higashi-Kanagawa Station","Yokohama Station","Higashi-Kanagawa Station","Ōguchi Station","Kikuna Station","Shin-Yokohama Station","Kozukue Station","Kamoi Station","Nakayama Station","Tōkaichiba Station","Nagatsuta Station","Naruse Station","Machida Station","Kobuchi Station","Fuchinobe Station","Yabe Station","Sagamihara Station","Hashimoto Station","Aihara Station","Hachiōjiminamino Station","Katakura Station","Hachiōji Station","Kawasaki Station","Shitte Station","Yakō Station","Kashimada Station","Hirama Station","Mukaigawara Station","Musashi-Kosugi Station","Musashi-Nakahara Station","Musashi-Shinjō Station","Musashi-Mizonokuchi Station","Tsudayama Station","Kuji Station","Shukugawara Station","Noborito Station","Nakanoshima Station","Inadazutsumi Station","Yanokuchi Station","Inaginaganuma Station","Minami-Tama Station","Fuchūhommachi Station","Bubaigawara Station","Nishifu Station","Yaho Station","Yagawa Station","Nishi-Kunitachi Station","Tachikawa Station","Hatchōnawata Station","Kawasakishimmachi Station","Odasakae Station","Hama-Kawasaki Station","Tōkyō Station","Kanda Station","Ochanomizu Station","Yotsuya Station","Shinjuku Station","Nakano Station","Kōenji Station","Asagaya Station","Ogikubo Station","Nishi-Ogikubo Station","Kichijōji Station","Mitaka Station","Musashi-Sakai Station","Higashi-Koganei Station","Musashi-Koganei Station","Kokubunji Station","Nishi-Kokubunji Station","Kunitachi Station","Tachikawa Station","Hino Station","Toyoda Station","Hachiōji Station","Nishi-Hachiōji Station","Takao Station","Mitaka Station","Kichijōji Station","Nishi-Ogikubo Station","Ogikubo Station","Asagaya Station","Kōenji Station","Nakano Station","Higashi-Nakano Station","Ōkubo Station","Shinjuku Station","Yoyogi Station","Sendagaya Station","Shinanomachi Station","Yotsuya Station","Ichigaya Station","Iidabashi Station","Suidōbashi Station","Ochanomizu Station","Akihabara Station","Asakusabashi Station","Ryōgoku Station","Kinshichō Station","Kameido Station","Hirai Station","Shin-Koiwa Station","Koiwa Station","Ichikawa Station","Moto-Yawata Station","Shimōsa-Nakayama Station","Nishi-Funabashi Station","Funabashi Station","Higashi-Funabashi Station","Tsudanuma Station","Makuharihongō Station","Makuhari Station","Shin-Kemigawa Station","Inage Station","Nishi-Chiba Station","Chiba Station","Tōkyō Station","Shimbashi Station","Shinagawa Station","Kawasaki Station","Yokohama Station","Totsuka Station","Ōfuna Station","Fujisawa Station","Tsujidō Station","Chigasaki Station","Hiratsuka Station","Ōiso Station","Ninomiya Station","Kōzu Station","Kamonomiya Station","Odawara Station","Hayakawa Station","Nebukawa Station","Manazuru Station","Yugawara Station","Atami Station","Kannami Station","Mishima Station","Numazu Station","Tōkyō Station","Ueno Station","Oku Station","Akabane Station","Urawa Station","Saitama-Shintoshin Station","Ōmiya Station","Toro Station","Higashi-Ōmiya Station","Hasuda Station","Shiraoka Station","Shin-Shiraoka Station","Kuki Station","Higashi-Washinomiya Station","Kurihashi Station","Koga Station","Nogi Station","Mamada Station","Oyama Station","Koganei Station","Jichi Medical University Station","Ishibashi Station","Suzumenomiya Station","Utsunomiya Station","Okamoto Station","Hōshakuji Station","Ujiie Station","Kamasusaka Station","Kataoka Station","Yaita Station","Nozaki Station","Nishi-Nasuno Station","Nasushiobara Station","Kuroiso Station","Tōkyō Station","Ueno Station","Oku Station","Akabane Station","Urawa Station","Saitama-Shintoshin Station","Ōmiya Station","Miyahara Station","Ageo Station","Kita-Ageo Station","Okegawa Station","Kitamoto Station","Kōnosu Station","Kita-Kōnosu Station","Fukiage Station","Gyōda Station","Kumagaya Station","Kagohara Station","Fukaya Station","Okabe Station","Honjō Station","Jimbohara Station","Shimmachi Station","Kuragano Station","Takasaki Station","Takasakitonyamachi Station","Ino Station","Shim-Maebashi Station","Maebashi Station","Ōsaki Station","Ebisu Station","Shibuya Station","Shinjuku Station","Ikebukuro Station","Itabashi Station","Jūjō Station","Akabane Station","Kita-Akabane Station","Ukimafunado Station","Toda-Kōen Station","Toda Station","Kita-Toda Station","Musashi-Urawa Station","Naka-Urawa Station","Minami-Yono Station","Yono-Hommachi Station","Kita-Yono Station","Ōmiya Station","Ōmiya Station","Nisshin Station","Nishi-Ōmiya Station","Sashiōgi Station","Minami-Furuya Station","Kawagoe Station","Nishi-Kawagoe Station","Matoba Station","Kasahata Station","Musashi-Takahagi Station","Komagawa Station","Tōkyō Station","Shimbashi Station","Shinagawa Station","Nishi-Ōi Station","Musashi-Kosugi Station","Shin-Kawasaki Station","Yokohama Station","Hodogaya Station","Higashi-Totsuka Station","Totsuka Station","Ōfuna Station","Kita-Kamakura Station","Kamakura Station","Zushi Station","Higashi-Zushi Station","Taura Station","Yokosuka Station","Kinugasa Station","Kurihama Station","Tōkyō Station","Shin-Nihombashi Station","Bakurochō Station","Kinshichō Station","Shin-Koiwa Station","Ichikawa Station","Funabashi Station","Tsudanuma Station","Inage Station","Chiba Station","Chigasaki Station","Kita-Chigasaki Station","Kagawa Station","Samukawa Station","Miyayama Station","Kurami Station","Kadosawabashi Station","Shake Station","Atsugi Station","Ebina Station","Iriya Station","Sōbudaishita Station","Shimomizo Station","Harataima Station","Banda Station","Kamimizo Station","Minami-Hashimoto Station","Hashimoto Station","Yokohama Station","Sakuragichō Station","Kannai Station","Ishikawachō Station","Yamate Station","Negishi Station","Isogo Station","Shin-Sugita Station","Yōkōdai Station","Kōnandai Station","Hongōdai Station","Ōfuna Station","Ōmiya Station","Saitama-Shintoshin Station","Yono Station","Kita-Urawa Station","Urawa Station","Minami-Urawa Station","Warabi Station","Nishi-Kawaguchi Station","Kawaguchi Station","Akabane Station","Higashi-Jūjō Station","Ōji Station","Kami-Nakazato Station","Tabata Station","Nishi-Nippori Station","Nippori Station","Uguisudani Station","Ueno Station","Okachimachi Station","Akihabara Station","Kanda Station","Tōkyō Station","Yūrakuchō Station","Shimbashi Station","Hamamatsuchō Station","Tamachi Station","Shinagawa Station","Ōimachi Station","Ōmori Station","Kamata Station","Kawasaki Station","Tsurumi Station","Shin-Koyasu Station","Higashi-Kanagawa Station","Yokohama Station","Sakuragichō Station","Kannai Station","Ishikawachō Station","Yamate Station","Negishi Station","Isogo Station","Shin-Sugita Station","Yōkōdai Station","Kōnandai Station","Hongōdai Station","Ōfuna Station","Shinagawa Station","Shimbashi Station","Tōkyō Station","Ueno Station","Nippori Station","Mikawashima Station","Minami-Senju Station","Kita-Senju Station","Matsudo Station","Kashiwa Station","Abiko Station","Tennōdai Station","Toride Station","Fujishiro Station","Sanuki Station","Ushiku Station","Hitachinoushiku Station","Arakawaoki Station","Tsuchiura Station","Shinjuku Station","Ikebukuro Station","Akabane Station","Urawa Station","Ōmiya Station","Toro Station","Higashi-Ōmiya Station","Hasuda Station","Shiraoka Station","Shin-Shiraoka Station","Kuki Station","Higashi-Washinomiya Station","Kurihashi Station","Koga Station","Nogi Station","Mamada Station","Oyama Station","Koganei Station","Jichi Medical University Station","Ishibashi Station","Suzumenomiya Station","Utsunomiya Station","Shinjuku Station","Ikebukuro Station","Akabane Station","Urawa Station","Ōmiya Station","Miyahara Station","Ageo Station","Kita-Ageo Station","Okegawa Station","Kitamoto Station","Kōnosu Station","Kita-Kōnosu Station","Fukiage Station","Gyōda Station","Kumagaya Station","Kagohara Station","Fukaya Station","Okabe Station","Honjō Station","Jimbohara Station","Shimmachi Station","Kuragano Station","Takasaki Station","Takasakitonyamachi Station","Ino Station","Shim-Maebashi Station","Maebashi Station","Shinjuku Station","Shibuya Station","Ebisu Station","Ōsaki Station","Nishi-Ōi Station","Musashi-Kosugi Station","Shin-Kawasaki Station","Yokohama Station","Hodogaya Station","Higashi-Totsuka Station","Totsuka Station","Ōfuna Station","Kita-Kamakura Station","Kamakura Station","Zushi Station","Shinjuku Station","Shibuya Station","Ebisu Station","Ōsaki Station","Nishi-Ōi Station","Musashi-Kosugi Station","Shin-Kawasaki Station","Yokohama Station","Hodogaya Station","Higashi-Totsuka Station","Totsuka Station","Ōfuna Station","Fujisawa Station","Tsujidō Station","Chigasaki Station","Hiratsuka Station","Ōiso Station","Ninomiya Station","Kōzu Station","Kamonomiya Station","Odawara Station","Tōkyō Station","Ueno Station","Oku Station","Akabane Station","Urawa Station","Saitama-Shintoshin Station","Ōmiya Station","Toro Station","Higashi-Ōmiya Station","Hasuda Station","Shiraoka Station","Shin-Shiraoka Station","Kuki Station","Higashi-Washinomiya Station","Kurihashi Station","Koga Station","Nogi Station","Mamada Station","Oyama Station","Koganei Station","Jichi Medical University Station","Ishibashi Station","Suzumenomiya Station","Utsunomiya Station","Okamoto Station","Hōshakuji Station","Ujiie Station","Kamasusaka Station","Kataoka Station","Yaita Station","Nozaki Station","Nishi-Nasuno Station","Nasushiobara Station","Kuroiso Station","Tōkyō Station","Ueno Station","Oku Station","Akabane Station","Urawa Station","Saitama-Shintoshin Station","Ōmiya Station","Miyahara Station","Ageo Station","Kita-Ageo Station","Okegawa Station","Kitamoto Station","Kōnosu Station","Kita-Kōnosu Station","Fukiage Station","Gyōda Station","Kumagaya Station","Kagohara Station","Fukaya Station","Okabe Station","Honjō Station","Jimbohara Station","Shimmachi Station","Kuragano Station","Takasaki Station","Takasakitonyamachi Station","Ino Station","Shim-Maebashi Station","Maebashi Station","Tōkyō Station","Shimbashi Station","Shinagawa Station","Kawasaki Station","Yokohama Station","Totsuka Station","Ōfuna Station","Fujisawa Station","Tsujidō Station","Chigasaki Station","Hiratsuka Station","Ōiso Station","Ninomiya Station","Kōzu Station","Kamonomiya Station","Odawara Station","Hayakawa Station","Nebukawa Station","Manazuru Station","Yugawara Station","Atami Station","Kannami Station","Mishima Station","Numazu Station","Shinagawa Station","Shimbashi Station","Tōkyō Station","Ueno Station","Nippori Station","Mikawashima Station","Minami-Senju Station","Kita-Senju Station","Matsudo Station","Kashiwa Station","Abiko Station","Tennōdai Station","Toride Station","Fujishiro Station","Sanuki Station","Ushiku Station","Hitachinoushiku Station","Arakawaoki Station","Tsuchiura Station","Shibuya Station","Omote-sando Station","Gaiemmae Station","Aoyama-itchome Station","Akasaka-mitsuke Station","Tameike-sanno Station","Toranomon Station","Shimbashi Station","Ginza Station","Kyobashi Station","Nihombashi Station","Mitsukoshimae Station","Kanda Station","Suehirocho Station","Ueno-hirokoji Station","Ueno Station","Inaricho Station","Tawaramachi Station","Asakusa Station","Ogikubo Station","Minami-asagaya Station","Shin-koenji Station","Higashi-koenji Station","Shin-nakano Station","Nakano-sakaue Station","Nishi-shinjuku Station","Shinjuku Station","Shinjuku-sanchome Station","Shinjuku-gyoemmae Station","Yotsuya-sanchome Station","Yotsuya Station","Akasaka-mitsuke Station","Kokkai-gijidomae Station","Kasumigaseki Station","Ginza Station","Tokyo Station","Otemachi Station","Awajicho Station","Ochanomizu Station","Hongo-sanchome Station","Korakuen Station","Myogadani Station","Shin-otsuka Station","Ikebukuro Station","Honancho Station","Nakano-fujimicho Station","Nakano-shimbashi Station","Naka-meguro Station","Ebisu Station","Hiro-o Station","Roppongi Station","Kamiyachō Station","Kasumigaseki Station","Hibiya Station","Ginza Station","Higashi-ginza Station","Tsukiji Station","Hatchōbori Station","Kayabachō Station","Ningyōchō Station","Kodemmachō Station","Akihabara Station","Naka-okachimachi Station","Ueno Station","Iriya Station","Minowa Station","Minami-senju Station","Kita-senju Station","Nakano Station","Ochiai Station","Takadanobaba Station","Waseda Station","Kagurazaka Station","Iidabashi Station","Kudanshita Station","Takebashi Station","Otemachi Station","Nihombashi Station","Kayabacho Station","Monzen-nakacho Station","Kiba Station","Toyocho Station","Minami-sunamachi Station","Nishi-kasai Station","Kasai Station","Urayasu Station","Minami-gyotoku Station","Gyotoku Station","Myoden Station","Baraki-nakayama Station","Nishi-funabashi Station","Yoyogi-uehara Station","Yoyogi-koen Station","Meiji-jingumae Station","Omote-sando Station","Nogizaka Station","Akasaka Station","Kokkai-gijidomae Station","Kasumigaseki Station","Hibiya Station","Nijubashimae Station","Otemachi Station","Shin-ochanomizu Station","Yushima Station","Nezu Station","Sendagi Station","Nishi-nippori Station","Machiya Station","Kita-senju Station","Ayase Station","Kita-ayase Station","Wakōshi Station","Chikatetsu-narimasu Station","Chikatetsu-akatsuka Station","Heiwadai Station","Hikawadai Station","Kotake-mukaihara Station","Senkawa Station","Kanamechō Station","Ikebukuro Station","Higashi-ikebukuro Station","Gokokuji Station","Edogawabashi Station","Iidabashi Station","Ichigaya Station","Koujimachi Station","Nagatachō Station","Sakuradamon Station","Yūrakuchō Station","Ginza-itchōme Station","Shintomichō Station","Tsukishima Station","Toyosu Station","Tatsumi Station","Shin-kiba Station","Shibuya Station","Omote-sandō Station","Aoyama-itchōme Station","Nagatachō Station","Hanzōmon Station","Kudanshita Station","Jimbōchō Station","Ōtemachi Station","Mitsukoshimae Station","Suitengūmae Station","Kiyosumi-shirakawa Station","Sumiyoshi Station","Kinshichō Station","Oshiage (SKYTREE) Station","Meguro Station","Shirokanedai Station","Shirokane-takanawa Station","Azabu-jūban Station","Roppongi-itchōme Station","Tameike-sannō Station","Nagatachō Station","Yotsuya Station","Ichigaya Station","Iidabashi Station","Kōrakuen Station","Tōdaimae Station","Hon-komagome Station","Komagome Station","Nishigahara Station","Ōji Station","Ōji-kamiya Station","Shimo Station","Akabane-iwabuchi Station","Wakōshi Station","Chikatetsu-narimasu Station","Chikatetsu-akatsuka Station","Heiwadai Station","Hikawadai Station","Kotake-mukaihara Station","Senkawa Station","Kanamechō Station","Ikebukuro Station","Zōshigaya Station","Nishi-waseda Station","Higashi-shinjuku Station","Shinjuku-sanchōme Station","Kita-sandō Station","Meiji-jingūmae(Harajuku) Station","Shibuya Station","Shinjuku Station","Minami-Shinjuku Station","Sangubashi Station","Yoyogi-Hachiman Station","Yoyogi-Uehara Station","Higashi-Kitazawa Station","Shimo-Kitazawa Station","Setagaya-Daita Station","Umegaoka Station","Gotokuji Station","Kyodo Station","Chitose-Funabashi Station","Soshigaya-Okura Station","Seijogakuen-mae Station","Kitami Station","Komae Station","Izumi-Tamagawa Station","Noborito Station","Mukogaoka-yuen Station","Ikuta Station","Yomiuriland-mae Station","Yurigaoka Station","Shin-Yurigaoka Station","Kakio Station","Tsurukawa Station","Tamagawagakuen-mae Station","Machida Station","Sagami-Ono Station","Odakyu Sagamihara Station","Sobudai-mae Station","Zama Station","Ebina Station","Atsugi Station","Hon-Atsugi Station","Aiko-Ishida Station","Isehara Station","Tsurumaki-Onsen Station","Tokaidaigaku-mae Station","Hadano Station","Shibusawa Station","Shin-Matsuda Station","Kaisei Station","Kayama Station","Tomizu Station","Hotaruda Station","Ashigara Station","Odawara Station","Sagami-Ono Station","Higashi-Rinkan Station","Chuo-Rinkan Station","Minami-Rinkan Station","Tsuruma Station","Yamato Station","Sakuragaoka Station","Koza-Shibuya Station","Chogo Station","Shonandai Station","Mutsuai-Nichidai-mae Station","Zengyo Station","Fujisawa-Hommachi Station","Fujisawa Station","Hon-Kugenuma Station","Kugenuma-Kaigan Station","Katase-Enoshima Station","Shin-Yurigaoka Station","Satsukidai Station","Kurihira Station","Kurokawa Station","Haruhino Station","Odakyu Nagayama Station","Odakyu Tama-Center Station","Karakida Station","Oshiage (SKYTREE) Station","Honjo-azumabashi Station","Asakusa Station","Kuramae Station","Asakusabashi Station","Higashi-nihombashi Station","Ningyocho Station","Nihombashi Station","Takaracho Station","Higashi-ginza Station","Shimbashi Station","Daimon Station","Mita Station","Sengakuji Station","Takanawadai Station","Gotanda Station","Togoshi Station","Nakanobu Station","Magome Station","Nishi-magome Station","Meguro Station","Shirokanedai Station","Shirokane-takanawa Station","Mita Station","Shibakōen Station","Onarimon Station","Uchisaiwaichō Station","Hibiya Station","Ōtemachi Station","Jimbōchō Station","Suidōbashi Station","Kasuga Station","Hakusan Station","Sengoku Station","Sugamo Station","Nishi-sugamo Station","Shin-itabashi Station","Itabashikuyakushomae Station","Itabashihonchō Station","Motohasunuma Station","Shimura-sakaue Station","Shimura-sanchōme Station","Hasune Station","Nishidai Station","Takashimadaira Station","Shin-takashimadaira Station","Nishi-takashimadaira Station","Shinjuku Station","Shinjuku-sanchome Station","Akebonobashi Station","Ichigaya Station","Kudanshita Station","Jimbocho Station","Ogawamachi Station","Iwamotocho Station","Bakuro-yokoyama Station","Hamacho Station","Morishita Station","Kikukawa Station","Sumiyoshi Station","Nishi-ojima Station","Ojima Station","Higashi-ojima Station","Funabori Station","Ichinoe Station","Mizue Station","Shinozaki Station","Motoyawata Station","Hikarigaoka Station","Nerima-kasugacho Station","Toshimaen Station","Nerima Station","Shin-egota Station","Ochiai-minami-nagasaki Station","Nakai Station","Higashi-nakano Station","Nakano-sakaue Station","Nishi-shinjuku-gochome Station","Tochomae Station","Shinjuku Station","Yoyogi Station","Kokuritsu-kyogijo Station","Aoyama-itchome Station","Roppongi Station","Azabu-juban Station","Akabanebashi Station","Daimon Station","Shiodome Station","Tsukijishijo Station","Kachidoki Station","Tsukishima Station","Monzen-nakacho Station","Kiyosumi-shirakawa Station","Morishita Station","Ryogoku Station","Kuramae Station","Shin-okachimachi Station","Ueno-okachimachi Station","Hongo-sanchome Station","Kasuga Station","Iidabashi Station","Ushigome-kagurazaka Station","Ushigome-yanagicho Station","Wakamatsu-kawada Station","Higashi-shinjuku Station","Shinjuku-nishiguchi Station","Azamino Station","Nakagawa Station","Center Kita Station","Center Minami Station","Nakamachidai Station","Nippa Station","Kita shin-yokohama Station","Shin-yokohama Station","Kishine-koen Station","Katakuracho Station","Mitsuzawa-kamicho Station","Mitsuzawa-shimocho Station","Yokohama Station","Takashimacho Station","Sakuragicho Station","Kannai Station","Isezaki-chojamachi Station","Bandobashi Station","Yoshinocho Station","Maita Station","Gumyoji Station","Kamiooka Station","Konanchuo Station","Kaminagaya Station","Shimonagaya Station","Maioka Station","Totsuka Station","Odoriba Station","Nakada Station","Tateba Station","Shimoiida Station","Shonandai Station","Hiyoshi Station","Hiyoshi-honcho Station","Takata Station","Higashiyamata Station","Kitayamata Station","Center Kita Station","Center Minami Station","Tsuzuki-fureainooka Station","Kawawacho Station","Nakayama Station","Shinjuku Station","Sasazuka Station","Daitabashi Station","Meidaimae Station","Shimo-takaido Station","Sakurajōsui Station","Kami-kitazawa Station","Hachimanyama Station","Roka-kōen Station","Chitose-karasuyama Station","Sengawa Station","Tsutsujigaoka Station","Shibasaki Station","Kokuryō Station","Fuda Station","Chōfu Station","Nishi-chōfu Station","Tobitakyū Station","Musashinodai Station","Tama-reien Station","Higashi-fuchū Station","Fuchū Station","Bubaigawara Station","Nakagawara Station","Seiseki-sakuragaoka Station","Mogusaen Station","Takahatafudō Station","Minamidaira Station","Hirayamajōshi-kōen Station","Naganuma Station","Kitano Station","Keiō-hachiōji Station","Shibuya Station","Shinsen Station","Komaba-tōdaimae Station","Ikenoue Station","Shimo-kitazawa Station","Shindaita Station","Higashi-matsubara Station","Meidaimae Station","Eifukuchō Station","Nishi-eifuku Station","Hamadayama Station","Takaido Station","Fujimigaoka Station","Kugayama Station","Mitakadai Station","Inokashira-kōen Station","Kichijōji Station","Shinjuku Station","Hatsudai Station","Hatagaya Station","Sasazuka Station","Kitano Station","Keiō-katakura Station","Yamada Station","Mejirodai Station","Hazama Station","Takao Station","Takaosanguchi Station","Chōfu Station","Keiō-tamagawa Station","Keiō-inadazutsumi Station","Keiō-yomiuri-land Station","Inagi Station","Wakabadai Station","Keiō-nagayama Station","Keiō-tama-center Station","Keiō-horinouchi Station","Minami-ōsawa Station","Tamasakai Station","Hashimoto Station","Higashi-fuchū Station","Fuchūkeiba-seimonmae Station","Takahatafudō Station","Tama-dōbutsukōen Station","Yokohama Station","Hiranumabashi Station","Nishi-Yokohama Station","Tennōchō Station","Hoshikawa Station","Wadamachi Station","Kami-Hoshikawa Station","Nishiya Station","Tsurugamine Station","Futamatagawa Station","Kibogaoka Station","Mitsukyō Station","Seya Station","Yamato Station","Sagami-ōtsuka Station","Sagamino Station","Kashiwadai Station","Ebina Station","Futamatagawa Station","Minami-Makigahara Station","Ryokuentoshi Station","Yayoidai Station","Izumino Station","Izumi-Chūō Station","Yumegaoka Station","Shōnandai Station","Shin-kiba Station","Shinonome Station","Kokusai-tenjijō Station","Tōkyō Teleport Station","Tennōzu Isle Station","Shinagawa Seaside Station","Ōimachi Station","Ōsaki Station","Sengakuji Station","Shinagawa Station","Kitashinagawa Station","Shimbamba Station","Aomono-yokochō Station","Samezu Station","Tachiaigawa Station","Ōmorikaigan Station","Heiwajima Station","Ōmorimachi Station","Umeyashiki Station","Keikyū Kamata Station","Zōshiki Station","Rokugōdote Station","Keikyū Kawasaki Station","Hatchō-nawate Station","Tsurumi-ichiba Station","Keikyū Tsurumi Station","Kagetsuen-mae Station","Namamugi Station","Keikyū Shinkoyasu Station","Koyasu Station","Kanagawa-shimmachi Station","Nakakido Station","Kanagawa Station","Yokohama Station","Tobe Station","Hinodechō Station","Koganechō Station","Minamiōta Station","Idogaya Station","Gumyōji Station","Kamiōoka Station","Byōbugaura Station","Sugita Station","Keikyū Tomioka Station","Nōkendai Station","Kanazawa-bunko Station","Kanazawa-hakkei Station","Oppama Station","Keikyū Taura Station","Anjinzuka Station","Hemi Station","Shioiri Station","Yokosuka-chūō Station","Kenritsudaigaku Station","Horinouchi Station","Keikyū Ōtsu Station","Maborikaigan Station","Uraga Station","Kanazawa-hakkei Station","Mutsuura Station","Jimmuji Station","Shinzushi Station","Keikyū Kamata Station","Kōjiya Station","Ōtorii Station","Anamori-inari Station","Tenkūbashi Station","Haneda Airport International Terminal Station","Haneda Airport Domestic Terminal Station","Keikyū Kawasaki Station","Minatochō Station","Suzukichō Station","Kawasakidaishi Station","Higashimonzen Station","Sangyōdōro Station","Kojimashinden Station","Horinouchi Station","Shin-ōtsu Station","Kitakurihama Station","Keikyū Kurihama Station","YRP Nobi Station","Keikyū Nagasawa Station","Tsukuihama Station","Miurakaigan Station","Misakiguchi Station","Asakusa Station","TOKYO SKYTREE Station","Oshiage (SKYTREE) Station","Hikifune Station","Higashi-mukōjima Station","Kanegafuchi Station","Horikiri Station","Ushida Station","Kita-senju Station","Kosuge Station","Gotanno Station","Umejima Station","Nishiarai Station","Takenotsuka Station","Yatsuka Station","Sōka Station","Dokkyodaigakumae Soka-matsubara Station","Shinden Station","Gamō Station","Shin-koshigaya Station","Koshigaya Station","Kita-koshigaya Station","Ōbukuro Station","Sengendai Station","Takesato Station","Ichinowari Station","Kasukabe Station","Kita-kasukabe Station","Himemiya Station","Tōbu-dōbutsu-kōen Station","Tōbu-dōbutsu-kōen Station","Wado Station","Kuki Station","Tōbu-dōbutsu-kōen Station","Sugito-takanodai Station","Satte Station","Minami-kurihashi Station","Kurihashi Station","Shin-koga Station","Yagyū Station","Itakura-toyodaimae Station","Fujioka Station","Shizuwa Station","Shin-ōhirashita Station","Tochigi Station","Shin-tochigi Station","Kassemba Station","Ienaka Station","Tōbu-kanasaki Station","Niregi Station","Momiyama Station","Shin-kanuma Station","Kita-kanuma Station","Itaga Station","Shimo-goshiro Station","Myōjin Station","Shimo-imaichi Station","Kami-imaichi Station","Tōbu-nikkō Station","Ikebukuro Station","Kita-ikebukuro Station","Shimo-itabashi Station","Ōyama Station","Naka-itabashi Station","Tokiwadai Station","Kami-itabashi Station","Tōbu-nerima Station","Shimo-akatsuka Station","Narimasu Station","Wakōshi Station","Asaka Station","Asakadai Station","Shiki Station","Yanasegawa Station","Mizuhodai Station","Tsuruse Station","Fujimino Station","Kami-fukuoka Station","Shingashi Station","Kawagoe Station","Kawagoeshi Station","Kasumigaseki Station","Tsurugashima Station","Wakaba Station","Sakado Station","Kita-sakado Station","Takasaka Station","Higashi-matsuyama Station","Shinrin-kōen Station","Tsukinowa Station","Musashi-ranzan Station","Ogawamachi Station","Tōbu-takezawa Station","Obusuma Station","Hachigata Station","Tamayodo Station","Yorii Station","Ikebukuro Station","Shiinamachi Station","Higashi-Nagasaki Station","Ekoda Station","Sakuradai Station","Nerima Station","Nakamurabashi Station","Fujimidai Station","Nerima-Takanodai Station","Shakujii-kōen Station","Ōizumi-gakuen Station","Hōya Station","Hibarigaoka Station","Higashi-Kurume Station","Kiyose Station","Akitsu Station","Tokorozawa Station","Nishi-Tokorozawa Station","Kotesashi Station","Sayamagaoka Station","Musashi-Fujisawa Station","Inariyama-kōen Station","Irumashi Station","Bushi Station","Motokaji Station","Hannō Station","Higashi-Hannō Station","Koma Station","Musashi-Yokote Station","Higashi-Agano Station","Agano Station","Kotake-mukaihara Station","Shin-Sakuradai Station","Nerima Station","Akabane-iwabuchi Station","Kawaguchi-motogō Station","Minami-hatogaya Station","Hatogaya Station","Araijuku Station","Tozuka-angyō Station","Higashi-kawaguchi Station","Urawa-misono Station"],reason:["a person being injured","an on-board medical emergency","a person on the tracks","a person coming in contact with a moving train","a passenger in distress","an incident between passengers","trouble with a passenger","a train car inspection","a platform safety inspection","a person on the tracks","a pedestrian on a railroad crossing","a vehicle on a railroad crossing","an accident with a vehicle on a railroad crossing","an accident with an animal on a railroad crossing","overcrowding","overcrowding on certain trains","personal belongings falling onto the tracks","a passenger being caught in a train door","passenger belongings being caught in a train door","harassment or inappropriate conduct","an investigation of an unusual noise on the tracks","an investigation of an unusual noise at a railroad crossing","an investigation of an unusual noise","a train inspection","a train inspection","a train failure","a door inspection","a door inspection","a door failure","a broken train window","a damaged train","an obstacle on the tracks","an issue with the tracks","track bed erosion","a track safety inspection","a track inspection","an issue with the tracks","a track inspection","a railroad switch safety inspection","a railroad switch inspection","an issue with a railroad switch","a railroad facility inspection","a safety equipment inspection","a safety equipment inspection","an issue with safety equipment","a signal inspection","a signal inspection","an issue with railroad signals","receiving an emergency stop signal","a railroad crossing safety inspection","a railroad crossing inspection","an issue with a railroad crossing","an accident at a railroad crossing","a platform door inspection","a platform door inspection","a platform door failure","a station facilities inspection","the removal of an obstructing foil balloon","an issue with the overhead lines","an issue with the overhead lines","a cable inspection","a power outage","an electrical equipment inspection","a collision","train derailment","a train fire","a train issue","an earthquake","lightning","a typhoon","a low pressure system","strong winds","heavy rainfall","snow","snow accumulation","dense fog","a landslide","a fallen tree","a fire along the railroad line","an inspection of railroad structures","heavy rains","strong winds","snow","heavy snow","an approaching low pressure system","a snow safety inspection","a southern shore low pressure system","the approach of typhoon number \\1","heavy rains and strong winds","heavy rains and strong winds caused by the approaching typhoon","activation of an emergency alarm button","activation of an emergency stop button","a trespassing incident on the tracks","cleaning of train cars","a passenger approaching a moving train","harassment or inappropriate conduct","a vandalism incident on a train","trespassing on railway premises","a passenger's umbrella falling onto the tracks","an unusual noise on a train","a mechanical issue on a train","a car replacement due to a mechanical issue","a door malfunction","a broken window","a broken window on a train","a door malfunction","a train safety inspection","personal belongings dropped on the tracks","items dropped on the tracks","an investigation of an unusual noise on the tracks","a fallen tree on the tracks","smoke emitting from the tracks","a fire on the tracks","the tracks collapsing","smoke on railroad premises","a fire on railroad premises","a signal inspection","repair work on railroad signal equipment","an issue with a signaling device","a signal failure","receiving an emergency stop signal","a railroad switch malfunction","a platform door sensor malfunction","a platform door malfunction","equipment failure","equipment failure at a station","inspection of a suspicious item","a platform gate sensor malfunction","a platform screen door sensor failure","an electrical equipment malfunction","a severed overhead line","an overhead line inspection","a tree branch in an overhead line","a power outage at a station","an electricity transmission problem","an unwell crew member","an unwell crew member","the transfer of passengers from the \\1","a delay on the \\1","a collision with a small animal","a collision with an obstacle","equipment failure","a tornado","speed restrictions because of strong winds","speed restrictions because of heavy rains","heavy rains and strong winds","speed restrictions because of snow","a safety inspection because of ice","speed restrictions because of the approaching typhoon","speed restrictions because of snow","an investigation of an unusual noise"]},e.newTemplates=["Due to ★ ● at ▲ on ■, services are suspended (between ▲ and ▲).","Normal services will resume ●.","We apologize for the inconvenience.","Due to ★ ● at ▲ on ■, trains are only operating between ▲ and ▲.","Passengers may use our replacement services.","Normal services were expected to resume ●, but due to ★, this will be delayed until ●.","Due to ★ ● at ▲ on ■, services are suspended (between ▲ and ▲).","Our technicians are currently investigating the cause. The expected time for normal services to resume will be announced ●.","Passengers are requested to travel via an alternative route.","Due to ★ ● at ▲ on ■, services are suspended (between ▲ and ▲).","Due to ★ ● at ▲ on ■, services were suspended (in some sections). These services have resumed as of ●.","Trains are currently running behind schedule.","Passengers in a hurry are requested to travel via an alternative route.","Due to ★ ● at ▲ on ■, services were suspended (in some sections). All local trains have resumed as of ●.","Trains are currently not running according to schedule.","Due to ★ ● at ▲ on ■, services are running significantly behind schedule.","Due to ★ ● at ▲ on ■, services are delayed (in some sections).","Due to ★ ● at ▲ on ■, this service is not running in some sections.","The inbound service on ■ is delayed.","The outbound service on ■ is delayed.","All services on ■ are delayed.","However, trains are operating normally.","Due to ★, services on ■ may ★.","Stations and trains are expected to be overcrowded due to the significant delay.","We apologize for the inconvenience.","We request that passengers refrain from travelling on this line if possible.","Due to ★, services on ■ are running at approximately {wari}.","Due to ★, services on ■ are not running according to schedule. However, trains are operating normally.","Due to ★, ▲ on ■ is now overcrowded. There will be a restriction on the number of passengers allowed to enter the station as of ●.","Due to ★, service on ■ may be suspended or delayed on ● to ensure safety.","Please be aware of these changes when using the train.","Thank you for using Tokyu Railway lines.","Due to ★, ★ is anticipated ●.","In order to ensure safety, service on ■ may be suspended, or train speeds may be reduced. Travel on this line may take longer than usual.","We apologize for the inconvenience, and suggest that you leave more time than usual for travel.","Particularly ●, we request that you refrain from travel on this line except when absolutely necessary.","In order to ensure safety, service on ■ may be cancelled.","The number of trains operating on all lines may also be reduced ●, and travel is anticipated to take longer than normal.","We apologize for the inconvenience. Particularly ●, we request that you refrain from travel on this line except when absolutely necessary.","Due to ★, trains on ■ will be taken out of service starting ● to ensure safety.","In order to ensure safety during ★, service on ■ will stop earlier than usual, with trains going out of service starting at ●.","We apologize for the inconvenience and request your understanding during this period.","Service may be cancelled earlier depending on weather conditions.","Due to ★, service on ■ has been reduced.","In addition, trains on ■ will stop running ●.","Passengers may use our replacement services.","The ○ bound for ▲ departing ▲ ● will be the last train on ■.","Due to ★, service on ■ has been cancelled.","We apologize for the inconvenience.","Transfers are available via ■, ■ and ■.","Please note that alternate transfer routes will not be provided.","Please note that transfers via alternate routes may be made free of charge by passengers with regular tickets, multi-ride tickets, and commuter passes that include ■.","Passengers with IC cards are not able to transfer free of charge. We apologize for the inconvenience.","The platforms at some stations are currently extremely crowded.","To ensure passenger safety, entry to these stations is being restricted at the ticket gates.","The S-TRAIN {num} service has been suspended.","Also, the Q-SEAT {num} service has been suspended and is currently not in service.","Train Status Information","All trains on the Tokyu lines are running normally.","Information will be provided when trains are delayed for more than 15 minutes, or when trains have been suspended or suspension is expected.","Routes","Train Station Access Information","Trains on the Tōyoko Line are running normally.","Trains on the Meguro Line are running normally.","Trains on the Den-en-toshi Line are running normally.","Trains on the Ōimachi Line are running normally.","Trains on the Ikegami Line are running normally.","Trains on the Tōkyū Tamagawa Line are running normally.","Trains on the Setagaya Line are running normally.","Trains on the Kodomonokuni Line are running normally.","Thank you for using Tokyu Railway lines.","Currently, we are unable to provide train status information.","We apologize for the inconvenience and appreciate your understanding.","We apologize for the inconvenience.","We are sorry for any inconveniences this may have caused."],e.oldTemplates=["Due to ★ at ● at ▲ on ■, services are suspended (between ▲ and ▲). Normal services will resume at ●. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, trains are only operating between ▲ and ▲. Normal services will resume at ●. Passengers may use our replacement services. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, trains are only operating between ▲ and ▲. Normal services were expected to resume at ●, but due to ★, this will be delayed until ●. Passengers may use our replacement services. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, services are suspended (between ▲ and ▲). Our technicians are currently investigating the cause. The expected time for normal services to resume will be announced at ●. Passengers are requested to travel via an alternative route. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, services are suspended (between ▲ and ▲). Our technicians are currently investigating the cause. The expected time for normal services to resume will be announced at ●. Passengers are requested to travel via an alternative route or use our replacement services. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, services were suspended (in some sections). These services have resumed as of ●. Trains are currently running behind schedule. (Passengers in a hurry are requested to travel via an alternative route.) Passengers may use our replacement services. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, services were suspended (in some sections). All local trains have resumed as of ●. Trains are currently not running according to schedule. Passengers may use our replacement services. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, services are running significantly behind schedule. Passengers in a hurry are requested to travel via an alternative route. Passengers may also use our replacement services. We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, this service is delayed (in some sections). (Passengers may use our replacement services.) We apologize for the inconvenience.","Due to ★ at ● at ▲ on ■, this service is not running in some sections. (Passengers may use our replacement services.) We apologize for the inconvenience.","Services on ■ may be delayed (both inbound and outbound). However, trains are operating normally. (Passengers may use our replacement services.)","Due to ★, services on ■ may ★. Stations and trains are expected to be overcrowded due to the significant delay. We apologize for the inconvenience. We request that passengers refrain from travelling on this line if possible.","Due to ★, services on ■ are running at approximately {wari}. Stations and trains are expected to be overcrowded due to the significant delay. We request that passengers refrain from travelling on this line if possible.","Due to ★, services on ■ are not running according to schedule. However, trains are operating normally. We apologize for the inconvenience.","Due to ★, ▲ on ■ is now overcrowded. There will be a restriction on the number of passengers allowed to enter the station as of ●. We request that passengers refrain from travelling on this line if possible.","Transfers are available via ■, ■ and ■.","Please note that alternate transfer routes will not be provided.","Please note that transfers via alternate routes may be made free of charge by passengers with regular tickets, multi-ride tickets, and commuter passes that include ■. Passengers with IC cards are not able to transfer free of charge. We apologize for the inconvenience.","The platforms at some stations are currently extremely crowded. To ensure passenger safety, entry to these stations is being restricted at the ticket gates.","The S-TRAIN {num} service has been suspended.","Also, the Q-SEAT {num} service has been suspended and is currently not in service.","Due to ★, service on ■ may be suspended or delayed on ● to ensure safety.Please be aware of these changes when using the train.","Thank you for using Tokyu Railway lines. Due to ★, ★ is/are anticipated ●. In order to ensure safety, service on ■ may be suspended, or train speeds may be reduced. Travel on this line may take longer than usual. We apologize for the inconvenience, and suggest that you leave more time than usual for travel. Particularly ●, we request that you refrain from travel on this line except when absolutely necessary.","Thank you for using Tokyu Railway lines. Due to ★, ★ is/are anticipated ●. In order to ensure safety, service on ■ may be cancelled. The number of trains operating on all lines may also be reduced ●, and travel is anticipated to take longer than normal. We apologize for the inconvenience. Particularly ●, we request that you refrain from travel on this line except when absolutely necessary.","Due to ★, trains on ■ will be taken out of service starting ● to ensure safety. Please be aware of these changes when using the train.","Thank you for using Tokyu Railway lines. In order to ensure safety during ★, service on ■ will stop earlier than usual, with trains going out of service starting at ●. We apologize for the inconvenience and request your understanding during this period.","Service may be cancelled earlier depending on weather conditions.","Due to ★, service on ■ has been reduced. In addition, trains on ■ will stop running ●. Passengers are requested to transfer to an alternate route. We apologize for the inconvenience.","The ○ bound for ▲ departing ▲ ● will be the last train on ■.","Due to ★, service on ■ has been cancelled. We apologize for the inconvenience.","Train Status Information","All trains on the Tokyu lines are running normally.","Information will be provided when trains are delayed for more than 15 minutes, or when trains have been suspended or suspension is expected.","Routes","Train Station Access Information","Trains on the Tōyoko Line are running normally.","Trains on the Meguro Line are running normally.","Trains on the Den-en-toshi Line are running normally.","Trains on the Ōimachi Line are running normally.","Trains on the Ikegami Line are running normally.","Trains on the Tōkyū Tamagawa Line are running normally.","Trains on the Setagaya Line are running normally.","Trains on the Kodomonokuni Line are running normally.","Thank you for using the Tokyu lines. Currently, we are unable to provide train status information. We apologize for the inconvenience and appreciate your understanding."],e}return n(e,t),e.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?" ("+e+")":this.markMap[t.name]||t.mark},e.prototype.translateMatchedText=function(t){if("between"===t.name){if(2===t.captureIndexes.length){var e=this.translations.station;return" between "+e[t.captureIndexes[0]]+" and "+e[t.captureIndexes[1]]}return""}if("reason"===t.name){if(137===t.index)return"the transfer of passengers from "+this.translations.line[t.captureIndexes[0]];if(138===t.index)return"a delay on "+this.translations.line[t.captureIndexes[0]]}var a=this.fixedTranslations[t.name];return a?0===t.captures.length?"":" "+a:t.index>=0?"time"===t.name&&2===t.index?"on "+this.months[+t.captures[1]-1]+". "+t.captures[2]:"time"===t.name&&3===t.index?"from the evening of "+this.months[+t.captures[1]-1]+". "+t.captures[2]+" until "+this.months[+t.captures[3]-1]+". "+t.captures[4]:"time"===t.name&&5===t.index?"morning and evening rush hour on "+this.daysOfWeek[+t.captures[1]]:this.translations[t.name][t.index]:void 0},Object.defineProperty(e.prototype,"templates",{get:function(){return this.newTemplates},enumerable:!0,configurable:!0}),e}(a(13).AbstractRuleBaseTranslation);e.default=new i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){this.markMap={between:new RegExp("(?:（?▲～▲之間）?)")},this.fixedTranslations={detour:"請趕時間的旅客搭乘本公司其他路線。",part_of_section:"部分區間",part_of_train:"部分",both:"上行線・下行線",alternative:"免費轉乘服務實施中。"},this.daysOfWeek=["周日","周一","周二","周三","周四","周五","周六"],this.translations={num:["\\1"],wari:["\\10%"],kind:["各站停車","急行","準急","通勤快速","特急"],time:["\\1點\\2分左右","\\1點以後","\\1月\\2日","\\1月\\2日晚間至\\3月\\4日","清晨至早上高峰時段","星期\\1的通勤時段","今天","明天","明天早上","颱風接近時","颱風最接近時","星期一","星期二","星期三","星期四","星期五","星期六","星期日","1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],line:["東橫線","目黑線","田園都市線","大井町線","池上線","東急","世田谷線","兒童之國線","港未來線","東急線全線","東急線各縣","東急線全線、東急線的一部分或全線"],station:["澀谷站","代官山站","中目黑站","祐天寺站","學藝大學站","都立大學站","自由丘站","田園調布站","多摩川站","新丸子站","武藏小杉站","元住吉站","日吉站","綱島站","大倉山站","菊名站","妙蓮寺站","白樂站","東白樂站","反町站","橫濱站","目黑站","不動前站","武藏小山站","西小山站","洗足站","大岡山站","奧澤站","田園調布站","多摩川站","新丸子站","武藏小杉站","元住吉站","日吉站","澀谷站","池尻大橋站","三軒茶屋站","駒澤大學站","櫻新町站","用賀站","二子玉川站","二子新地站","高津站","溝之口站","梶谷站","宮崎台站","宮前平站","鷺沼站","多摩廣場站","薊野站","江田站","市尾站","藤丘站","青葉台站","田奈站","長津田站","土筆野站","鈴懸台站","南町田站","月見野站","中央林間站","大井町站","下神明站","戶越公園站","中延站","荏原町站","旗之台站","北千束站","大岡山站","綠丘站","自由丘站","九品佛站","尾山台站","等等力站","上野毛站","二子玉川站","溝之口站","五反田站","大崎廣小路站","戶越銀座站","荏原中延站","旗之台站","長原站","洗足地站","石川台站","雪谷大塚站","御嶽山站","久原站","千鳥町站","池上站","蓮沼站","蒲田站","多摩川站","沼部站","鵜之木站","下丸子站","武藏新田站","矢口渡站","蒲田站","三軒茶屋站","西太子堂站","若林站","松陰神社前站","世田谷站","上町站","宮之坂站","山下站","松原站","下高井戶站","長津田站","恩田站","兒童之國站","新高島站","港未來站","馬車道站","日本大道站","元町・中華街站"],reason:["人身事故","搶救緊急病患","乘客墜落軌道","乘客碰觸列車","乘客救護","乘客糾紛","處理乘客問題","車輛檢查","月台安全確認","有人誤入軌道","有人逗留於平交道","車輛困於平交道","列車於平交道與汽車碰撞","列車於平交道與動物碰撞","人多擁擠","部分列車過於擁擠","乘客行李墜落軌道","乘客身體被車門夾住","乘客行李被車門夾住","妨害行為","軌道內異常聲響確認","平交道內異常聲響確認","異常聲響確認","車輛確認","車輛檢查","車輛故障","車門確認","車門檢查","車門故障","車輛玻璃破裂","車輛損壞","軌道上有障礙物","鐵軌損壞","道碴流失","軌道安全確認","軌道檢查","軌道故障","軌道內確認・檢查","道岔安全確認","道岔檢查","道岔故障","鐵道設備確認・檢查","鐵路安全裝置確認","鐵路安全裝置檢查","鐵路安全裝置故障","信號確認","信號檢查","信號故障","收到緊急停車信號","平交道安全確認","平交道檢查","平交道裝置故障","平交道事故","月台閘門確認","月台閘門檢查","月台閘門故障","車站設備確認・檢查","處理漂浮鋁箔氣球","接觸線上有障礙物","接觸線故障","供電確認","停電","供電設備確認・檢查","列車撞擊事故","列車脫軌事故","列車火災","列車干擾","地震","雷擊","颱風","低氣壓","強風","豪雨","雪","積雪","濃霧","砂石坍方","樹木倒塌","鐵路沿線火災","基礎結構確認・檢查","豪雨","強風","下雪","大雪","低氣壓接近","下雪確保安全行駛","南岸低氣壓接近","颱風\\1號接近","豪雨及強風","颱風接近引起的豪雨・強風","車內緊急按鈕的警報","緊急停車按鈕的警報","有人誤闖軌道引起的警報","車內清掃","乘客過於接近列車","車內妨害行為","對車輛的惡作劇行為","有人闖入鐵道用地","乘客的傘掉落軌道","車輛傳出異常聲響","車輛故障","更換故障車輛","門開啟故障","窗戶玻璃破裂","車輛窗戶玻璃破裂","車門故障","車輛安全確認","軌道內行李掉落","軌道內物品掉落","軌道內異常聲響的原因確認","軌道內樹木倒塌","軌道內出現煙霧","軌道內火災","軌道塌陷","鐵道用地出現煙霧","鐵道用地火災","信號確認","修復故障信號設備","信號裝置故障","信號燈故障","接收列車緊急停止信號","道岔故障","月台閘門感應不良","月台閘門開關故障","設備問題","車站設備故障","可疑物品確認","月台柵欄感應不良","月台柵欄故障","供電設備故障","接觸線斷裂","接觸線檢查","接觸線與樹枝交纏","車站內停電","供電問題","乘務員身體不適","乘務員身體不適","承接\\1線的轉乘服務","因\\1線延遲的影響","碰撞到小動物","碰撞到障礙物","設備問題","龍捲風的影響","強風所訂定的速限","豪雨所訂定的速限","豪雨和強風的影響","下雪所訂定的速限","凍結路面的軌道確認","颱風接近所訂定的速限","大雪所訂定的速限","車內異常聲響確認"]},this.newTemplates=["●，■因▲★，（▲～▲之間）列車暫停行駛。","預計通車時間為●。","造成您的不便，我們深感抱歉。","●，■因▲★的影響，列車僅在▲～▲之間往復行駛。","免費轉乘服務實施中。","原本預計於●正常通車，但因★，需更改至●。","●，■因▲★的影響，（▲～▲之間）列車暫停行駛。","由於負責人員正在調查原因，預計於●公布通車時間。","請旅客搭乘其他路線。","■在●因▲★的影響而暫停行駛之（部分區間）列車已經於●恢復通車。","另外，目前班車仍有延遲。","（請趕時間的旅客搭乘本公司其他路線。）","■在●因▲★的影響而暫停行駛之（部分區間）列車，已於●，以區間中途各站皆停的方式恢復通車。","目前時刻表混亂。","●，■因▲★的影響，列車嚴重延遲，乘車時間也大幅增加。","趕時間的旅客請搭乘其他路線。","●，■因▲★的影響，（部分）列車延遲。","（免費轉乘服務實施中。）","●，■因▲★的影響，部分列車停止運行。","■（上行線・下行線）列車延遲。","但乘車時間大致與平時相同。","■預計將進行因★的影響所造成的★。","列車將嚴重延遲，乘車時間也大幅增加，車站與列車內也可能會有人多擁擠的情形。","將造成乘客很大的不便。","請盡可能避免搭乘本線，感謝您的諒解。","■因★的影響，列車以平時的{wari}速度行駛。","■因★的影響時刻表混亂，但乘車時間與平時大致相同。","■▲因★的影響，站內人多擁擠，於現在時刻●實施入場管制。","■、■、■等線免費轉乘服務實施中。","另外，現在各鐵路公司並未提供免費轉乘服務。","另外，免費轉乘服務僅供持有包含■之月票、一般車票、回數票的旅客使用。","使用IC卡內儲值金額的旅客恕無法使用免費轉乘服務，感謝您的諒解。","部分車站月台目前非常擁擠。","為確保安全，剪票口將實施進站管制。","S-TRAIN{num}號停止運行。","另外因Q-SEAT{num}號停止運行，服務將中止。","受到★的影響，●，為確保運行安全，■可能會延遲或暫停行駛。","乘車時請注意相關資訊。","感謝各位旅客搭乘東急線。","因★的影響，●，預計會★。","為確保運行安全，■將暫停行駛或是降低列車行駛速度，可能造成旅客乘車時間增加。","請旅客預留足夠時間出門，造成您的不便，敬請見諒。","特別在●，請盡可能避免搭乘本線。","為確保運行安全，■有可能暫停行駛。","另外，因●開始減少運行班次，預計將造成旅客乘車時間增加。","特別在●，請盡可能避免搭乘本線，造成您的不便，敬請見諒。","因★的影響，為確保安全，●以後■將不再發車。","因★的影響，為確保運行安全，■的末班車時間將提早為●，之後不再發車。","造成您的不便，敬請諒解。","有可能因天氣狀況而提早停止運行。","■因★的影響，已減少運行班次。","另外，■將於●後停止運行。","免費轉乘服務實施中。","造成您的不便，我們深感抱歉。","■的末班車為●從▲發車，往▲方向的○。","■因受到★的影響已停止運行。","運行狀況","東急各線正常運行中。","運行中的列車若發生15分鐘以上的延遲、暫停行駛或是預計暫停行駛時，將透過運行狀況公告。","路線名","車站進站管制資訊","東橫線正常運行中。","目黑線正常運行中。","田園都市線正常運行中。","大井町線正常運行中。","池上線正常運行中。","東急多摩川線正常運行中。","世田谷線正常運行中。","兒童之國線正常運行中。","現在運行狀況無法正常顯示。","造成旅客的不便，我們深感抱歉。"],this.oldTemplates=["●，■因▲★，（▲～▲之間）列車暫停行駛，預計通車時間為●。造成您的不便，我們深感抱歉。","●，■因▲★的影響，列車僅在▲～▲之間往復行駛。預計於●恢復通車。免費轉乘服務實施中。造成您的不便，我們深感抱歉。","●，■因▲★的影響，列車僅在▲～▲之間往復行駛。原本預計於●正常通車，但因★，需更改至●。免費轉乘服務實施中。造成您的不便，敬請見諒。","●，■因▲★的影響，（▲～▲之間）列車暫停行駛。由於負責人員正在調查原因，預計於●公布通車時間。請旅客搭乘其他路線。造成您的不便，我們深感抱歉。","●，■因▲★的影響，（▲～▲之間）列車暫停行駛。由於負責人員正在調查原因，預計於●公布通車時間。請旅客搭乘其他路線。免費轉乘服務實施中。造成您的不便，我們深感抱歉。","■在●因▲★的影響而暫停行駛之（部分區間）列車已經於●恢復通車。另外，目前班車仍有延遲。（請趕時間的旅客搭乘本公司其他路線。）免費轉乘服務實施中。造成您的不便，敬請見諒。","■在●因▲★的影響而暫停行駛之（部分區間）列車，已於●，以區間中途各站皆停的方式恢復通車。目前時刻表混亂。免費轉乘服務實施中。造成您的不便，敬請見諒。","●，■因▲★的影響，列車嚴重延遲，乘車時間也大幅增加。趕時間的旅客請搭乘其他路線。免費轉乘服務實施中。造成您的不便，敬請見諒。","●，■因▲★的影響，（部分）列車延遲。（免費轉乘服務實施中。）造成您的不便，敬請見諒。","●，■因▲★的影響，部分列車停止服務。（免費轉乘服務實施中。）造成您的不便，敬請見諒。","■（上行線・下行線）列車延遲，但乘車時間大致與平時相同。（免費轉乘服務實施中。）","■預計將進行因★的影響所造成的★。列車將嚴重延遲，乘車時間也大幅增加，車站與列車內也可能會有人多擁擠的情形。將造成乘客很大的不便。請盡可能避免搭乘本線，感謝您的諒解。","■因★的影響，列車以平時的{wari}速度行駛。因列車嚴重延遲與乘車時間增加，預計站內將非常擁擠，造成旅客很大不便。請盡可能避免搭乘本線，感謝您的諒解。","■因★的影響時刻表混亂，但乘車時間與平時大致相同。造成您的不便，我們深感抱歉。","■▲因★的影響，站內人多擁擠，於現在時刻●實施入場管制。預計會造成旅客很大不便，請盡可能避免搭乘本線，感謝您的諒解。","■、■、■等線免費轉乘服務實施中。","另外，現在各鐵路公司並未提供免費轉乘服務。","另外，免費轉乘服務僅供持有包含■之月票、一般車票、回數票的旅客使用。使用IC卡內儲值金額的旅客恕無法使用免費轉乘服務，感謝您的諒解。","部分車站月台目前非常擁擠。為確保安全，剪票口將實施進站管制。","S-TRAIN{num}號停止運行。","另外因Q-SEAT{num}號停止運行，服務將中止。","受到★的影響，●，為確保運行安全，■可能會延遲或暫停行駛。乘車時請注意相關資訊。","感謝各位旅客搭乘東急線。因★的影響，●，預計會★。為確保運行安全，■將暫停行駛或是降低列車行駛速度，可能造成旅客乘車時間增加。請旅客預留足夠時間出門，造成您的不便，敬請見諒。特別在●，請盡可能避免搭乘本線。","感謝各位旅客搭乘東急線。因★的影響，●，預計會★。為確保運行安全，■有可能暫停行駛。另外，因●開始減少運行班次，預計將造成旅客乘車時間增加。特別在●，請盡可能避免搭乘本線，造成您的不便，敬請見諒。","因★的影響，為確保安全，●以後■將不再發車。乘車時請注意相關資訊。","感謝各位旅客搭乘東急線。因★的影響，為確保運行安全，■的末班車時間將提早為●，之後不再發車。造成您的不便，敬請諒解。","有可能因天氣狀況而提早停止運行。","■因★的影響，已減少運行班次。另外，■將於●後停止運行。免費轉乘服務實施中。造成您的不便，我們深感抱歉。","■的末班車為●從▲發車，往▲方向的○。","■因受到★的影響已停止運行。造成您的不便，我們深感抱歉。","運行狀況","東急各線正常運行中。","運行中的列車若發生15分鐘以上的延遲、暫停行駛或是預計暫停行駛時，將透過運行狀況公告。","路線名","車站進站管制資訊","東橫線正常運行中。","目黑線正常運行中。","田園都市線正常運行中。","大井町線正常運行中。","池上線正常運行中。","東急多摩川線正常運行中。","世田谷線正常運行中。","兒童之國線正常運行中。","感謝各位旅客搭乘東急線。現在運行狀況無法正常顯示。造成旅客的不便，我們深感抱歉。"]}return t.prototype.translate=function(t,e){for(var a=e.matches,n=this.templates[t],i=function(){var t=a[r],i=o.translateMatchedText(t,e);if(void 0!==i){var s=i.replace(/\\\d/g,function(e){return t.captures[e.slice(1)]}),u=o.findReplaceMarker(t);n=n.replace(u,s)}},o=this,r=0;r<a.length;++r)i();return n},t.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?"（"+e+"）":this.markMap[t.name]||t.mark},t.prototype.translateMatchedText=function(t,e){if("between"===t.name){if(2===t.captureIndexes.length){var a=this.translations.station;return a[t.captureIndexes[0]]+"～"+a[t.captureIndexes[1]]+"之間"}return""}if("reason"===t.name){if(137===t.index)return"承接"+this.translations.line[t.captureIndexes[0]]+"線的轉乘服務";if(138===t.index)return"因"+this.translations.line[t.captureIndexes[0]]+"線延遲的影響"}var n=this.fixedTranslations[t.name];return n?0===t.captures.length?"":n:t.index>=0?"time"===t.name&&5===t.index?"星期"+this.daysOfWeek[+t.captures[1]]+"的通勤時段":this.translations[t.name][t.index]:void 0},Object.defineProperty(t.prototype,"templates",{get:function(){return this.oldTemplates},enumerable:!0,configurable:!0}),t}();e.default=new n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){this.markMap={between:new RegExp(" \\(?▲~▲ 사이\\)?")},this.fixedTranslations={detour:"급한 용무가 있으신 경우에는 우회하여 승차하시길 바랍니다",part_of_section:"일부 구간에서",part_of_train:"일부 열차에서",both:"상행・하행선에서",alternative:"대체 수송을 시행하고 있습니다"},this.daysOfWeek=["일","월","화","수","목","금","토"],this.translations={num:["\\1"],wari:["\\1"],kind:["각역 정차","급행","준급행","통근 쾌속","특급"],time:["\\1시 \\2분 경","\\1시 이후","\\1월 \\2일","\\1월 \\2일 밤부터 \\3월 \\4일에 걸쳐","조조부터 아침 러시아워에 걸쳐","\\1요일 출퇴근 시간대","금일","내일","모레","태풍 접근시","태풍 최접근시","월요일","화요일","수요일","목요일","금요일","토요일","일요일","1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"],line:["도요코선","메구로선","덴엔토시선","오이마치선","이케가미선","도큐 다마가와선","세타가야선","고도모노쿠니선","미나토미라이선","도큐선 전 노선","도큐선 각 노선","도큐선 각 노선, 도큐선의 일부 또는 전 노선"],station:["시부야역","다이칸야마역","나카메구로역","유텐지역","가쿠게이다이가쿠역","도리츠다이가쿠역","지유가오카역","뎅엔쵸후역","다마가와역","신마루코역","무사시코스기역","모토스미요시역","히요시역","츠나시마역","오쿠라야마역","기쿠나역","묘렌지역","하쿠라쿠역","히가시하쿠라쿠역","단마치역","요코하마역","메구로역","후도마에역","무사시코야마역","니시코야마역","센조쿠역","오오카야마역","오쿠사와역","뎅엔쵸후역","다마가와역","신마루코역","무사시코스기역","모토스미요시역","히요시역","시부야역","이케지리오하시역","산겐자야역","고마자와다이가쿠역","사쿠라신마치역","요가역","후타코타마가와역","후타코신치역","다카츠역","미조노쿠치역","가지가야역","미야자키다이역","미야마에다이라역","사기누마역","다마프라자역","아자미노역","에다역","이치가오역","후지가오카역","아오바다이역","다나역","나가츠타역","츠쿠시노역","스즈카케다이역","미나미마치다역","츠키미노역","추오린칸역","오이마치역","시모신메이역","도고시코엔역","나카노부역","에바라마치역","하타노다이역","기타센조쿠역","오오카야마역","미도리가오카역","지유가오카역","쿠혼부츠역","오야마다이역","도도로키역","가미노게역","후타코타마가와역","미조노쿠치역","고탄다역","오사키히로코지역","도고시긴자역","에바라나카노부역","하타노다이역","나가하라역","센조쿠이케역","이시카와다이역","유키가야오츠카역","온타케산역","구가하라역","치도리초역","이케가미역","하스누마역","가마타역","다마가와역","누마베역","우노키역","시모마루코역","무사시닛타역","야구치노와타시역","가마타역","산겐자야역","니시타이시도역","와카바야시역","쇼인진자마에역","세타가야역","가미마치역","미야노사카역","야마시타역","마츠바라역","시모타카이도역","나가츠타역","온다역","고도모노쿠니역","신타카시마역","미나토미라이역","바샤미치역","니혼오도리역","모토마치・추카가이역"],reason:["인명사고","응급환자 구호","승객 선로 추락","승객과 열차 접촉","승객 구호","승객 간 다툼","승객 대응","열차 내부 확인","승강장 안전 확인","선로 내 사람 진입","건널목 내 보행자 잔류","건널목 내 차량 잔류","건널목 내 차량 접촉","건널목 내 동물 접촉","혼잡","일부 열차 혼잡 집중","소지품 선로 낙하","출입문 끼임 사고","출입문 소지품 끼임","소란 행위","선로 내 이상음 확인","건널목 이상음 확인","이상음 확인","차량 확인","차량 점검","차량 고장","출입문 확인","출입문 점검","출입문 고장","차량 유리 파손","차량 파손","선로 장애물","선로 절단","도상 유출","선로 안전 확인","선로 점검","선로 고장","선로 확인 및 점검","분기기 안전 확인","분기기 점검","분기기 고장","철도시설 확인 및 점검","보안장치 확인","보안장치 점검","보안장치 고장","신호 확인","신호 점검","신호 고장","긴급정지신호 수신","건널목 안전 확인","건널목 점검","건널목 고장","건널목 사고","스크린도어 확인","스크린도어 점검","스크린도어 고장","역 설비 확인 및 점검","알루미늄 호일 풍선 처리","전차선 장애물 처리","전차선 고장","송전 확인","정전","전기설비 확인 및 점검","열차 충돌 사고","열차 탈선 사고","열차 화재","열차 방해","지진","낙뢰","태풍","저기압","강풍","폭우","눈","적설","짙은 안개","토사붕괴","쓰러진 나무","선로변 화재","구조물 확인 및 점검","폭우","강풍","강설","폭설","저기압 접근","강설에 따른 안전운행 확보","온대 저기압 접근","태풍 \\1호 접근","폭우 및 강풍","태풍 접근으로 인한 폭우 및 강풍","열차 내부 비상통보버튼 통보","비상정지버튼 통보","선로 내 사람 진입 통보를 받은 것","열차 내부 청소","승객의 열차 접근","열차 내부 소란 행위","차량 장난 행위","철도 부지 내 사람 진입","승객의 우산이 선로에 낙하한 것","차량 이상음 감지","열차 장애","열차 장애으로 인한 차량 교환","출입문 장애","창문 파손","차량 창문 파손","차량 출입문 장애","차량 안전 확인","선로 내 소지품 낙하","선로 낙하물","선로 이상음 원인 확인","선로 내 쓰러진 나무","선로 내 연기 발생","선로 내 화재","선로 함몰","철도 부지 내 연기 발생","철도 부지 내 화재","신호 확인","신호설비 고장의 복구 작업","신호장치 고장","신호기 고장","열차 긴급정지신호 수신","분기기 장치 장애","스크린도어 센서 장애","스크린도어 개폐 장애","설비 문제","역 설비 고장","의심스러운 물건 확인","스크린도어 센서 장애","스크린도어 센서 고장","전기설비 장애","가선 절단","가선 점검","가선에 나뭇가지가 걸린 것","역 구내 정전","송전 문제","승무원 컨디션 불량","승무원 컨디션 불량 발생","\\1선으로 부터 대체수송 수탁","\\1선 지연의 영향","소동물과 접촉","장애물과 접촉","설비 문제","용오름 발생의 영향","강풍으로 인한 속도 규제","폭우로 인한 속도 규제","폭설 및 강풍의 영향","강설로 인한 속도 규제","동결로 인한 선로 확인","태풍 접근에 따른 속도 규제","폭설로 인한 속도 규제","열차 내부 이상음 확인"]},this.newTemplates=["●, ■은 ▲에서 발생한 ★의 영향으로 (▲~▲ 사이) 운행이 보류되고 있습니다.","운행 재개는 ●(으)로 예상됩니다.","불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 ▲~▲ 사이 구간에서 순환 운행하고 있습니다.","대체 수송을 시행하고 있습니다.","운행 재개 예상 시간은 ●(이)였으나, ★의 영향으로 ● 예정으로 변경합니다.","또한 현재 담당 직원이 원인을 조사하는 중이며 운행 재개 예상 시간은 ●에 알려드릴 예정입니다.","우회하여 승차하시길 바랍니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (일부 구간에서) 운행을 보류하고 있었으나, ●, 운행을 재개하였습니다.","또한 현재 운행 지연이 발생하고 있습니다.","(급한 용무가 있으신 경우에는 우회하여 승차하시길 바랍니다)","●, ■은 ▲에서 발생한 ★의 영향으로 (일부 구간에서) 운행을 보류하고 있었으나, ●, 전 열차 각 역 정차로 운행을 재개하였습니다.","또한 현재 운행 시간이 지체되고 있습니다.","●, ■은 ▲에서 발생한 ★의 영향으로 대폭 지연되고 있으며 소요 시간이 길어지고 있습니다.","급한 용무가 있으신 경우에는 우회하여 승차하시길 바랍니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (일부 열차에서) 운행이 지연되고 있습니다.","(대체 수송을 시행하고 있습니다)","●, ■은 ▲에서 발생한 ★의 영향으로 일부 열차의 운행이 중단되었습니다.","■선은 (상행・하행선에서) 지연되고 있습니다.","또한 소요 시간은 대체로 변경되지 않았습니다.","■은 ★의 영향으로 ★에 의한 운행이 예상됩니다.","열차가 대폭 지연되어 소요 시간이 늘어남에 따라 역이나 차내가 혼잡할 것으로 예상됩니다.","손님분들께 큰 불편을 끼쳐 드려 죄송합니다.","가능한 외출은 삼가시길 바라며 양해의 말씀을 드립니다.","■은 ★의 영향으로 통상의 {wari}할 정도로 운행되고 있습니다.","■은 ★의 영향으로 운행 시간이 지체되고 있습니다만 소요 시간은 대체로 변경되지 않았습니다.","■ ▲은 ★의 영향으로 혼잡한 상태이며 ● 현재 입장을 규제하고 있습니다.","대체 운행은 ■、■、■등에서 실시되고 있습니다.","또한, 각 철도 회사의 대체 운송은 실시하지 않습니다.","또한, 대체운행은, ■를 포함한 정기권, 표,회수권을 가지고 계신 분만 사용 가능합니다.","IC카드의 충전액(잔액)에 의한 이용은 대체 운행 이용이 불가하오니 양해 부탁드립니다.","일부 역에서는 플랫폼이 굉장히 혼잡하고 있습니다.","안전을 확보하기 위해 역 개찰구에서 입장 제한을 시행하고 있습니다.","Ｓ－ＴＲＡＩＮ{num}호는 운행 정지중입니다.","또한, Ｑ－ＳＥＡＴ{num}호는 운행 정지를 위해 서비스를 중지합니다.","★의 영향으로 ● 안전 확보를 위해 ■은 운행 중지나 지연이 발생할 가능성이 있습니다.","이용시 주의해 주십시오.","항상 도큐선을 이용해주셔서 감사합니다.","★의 영향으로 ● ★이/가 예상되고 있습니다.","안전 운행 확보를 위해 ■은 운행 중지나 감속 운행을 하는 경우가 있어 평소보다 장시간이 소요될 가능성이 있습니다.","고객님들께서는 불편하시겠지만 시간적 여유를 가지고 외출해 주십시오.","특히 ●에는 가능한 외출을 삼가시도록 부탁드리겠습니다.","안전 운행 확보를 위해 ■은 운행이 중단될 가능성이 있습니다.","또한, ●에서는 전 노선 감축 운행으로 인해 평소보다 장시간이 소요될 가능성이 있습니다.","고객님들께서는 불편하시겠지만, 특히 ●에는 가능한 외출을 삼가시도록 부탁드리겠습니다.","★의 영향으로 ● 이후 안전 확보를 위해 ■은 순차적으로 운행을 중지합니다.","★에 따른 안전 운행 확보를 위해 ■은 막차 시간을 앞당겨 ●시 이후 순차적으로 운행을 중지합니다.","고객님들께서는 불편하시겠지만 양해해주시기를 부탁드립니다.","날씨 상황에 따라 예정보다 빨리 운행이 중단될 가능성이 있습니다.","■은 ★의 영향으로 감축 운행을 하고 있습니다.","또한, ■은 ●를 끝으로 운행을 종료하겠습니다.","대체 수송을 시행하고 있습니다.","불편을 끼쳐 드려 대단히 죄송합니다.","■은▲을/를 ●에 발차하는 ○・▲행 열차가 마지막 열차입니다.","■은 ★의 영향으로 운행을 종료하였습니다.","운행 정보","각 도큐선은, 평상시대로 운행하고 있습니다.","열차의 운행에 15분 이상의 지연, 운전 보류가 발생 혹은 예상되는 경우에는 운행 정보를 공지하고 있습니다.","노선명","역 입장 규제 정보","도큐선은 평상시대로 운행하고 있습니다.","메구로선은 평상시대로 운행하고 있습니다.","덴엔토시선은 평상시대로 운행하고 있습니다.","오이마치선은 평상시대로 운행하고 있습니다.","이케가미선은 평상시대로 운행하고 있습니다.","도큐 다마가와선은 평상시대로 운행하고 있습니다.","세타가야선은 평상시대로 운행하고 있습니다.","고도모노쿠니선은 평상시대로 운행하고 있습니다.","현재 운행 정보의 표시에 문제가 발생하고 있습니다.","여러분께 불편함을 끼쳐 죄송합니다. 양해 부탁드립니다."],this.oldTemplates=["●, ■은 ▲에서 발생한 ★의 영향으로 (▲~▲ 사이) 운행이 보류되고 있습니다. 운행 재개는 ●(으)로 예상됩니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 ▲~▲ 사이 구간에서 순환 운행하고 있습니다. 운행 재개는 ●(으)로 예상됩니다. 대체 수송을 시행하고 있습니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 ▲~▲ 사이 구간에서 순환 운행하고 있습니다. 운행 재개 예상 시간은 ●(이)였으나, ★의 영향으로 ● 예정으로 변경합니다. 대체 수송을 시행하고 있습니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (▲~▲ 사이) 운행이 보류되고 있습니다. 또한 현재 담당 직원이 원인을 조사하는 중이며 운행 재개 예상 시간은 ●에 알려드릴 예정입니다. 우회하여 승차하시길 바랍니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (▲~▲ 사이) 운행이 보류되고 있습니다. 또한 현재 담당 직원이 원인을 조사하는 중이며 운행 재개 예상 시간은 ●에 알려드릴 예정입니다. 우회하여 승차하시길 바랍니다. 대체 수송을 시행하고 있습니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (일부 구간에서) 운행을 보류하고 있었으나, ●, 운행을 재개하였습니다. 또한 현재 운행 지연이 발생하고 있습니다. (급한 용무가 있으신 경우에는 우회하여 승차하시길 바랍니다) 대체 수송을 시행하고 있습니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (일부 구간에서) 운행을 보류하고 있었으나, ●, 전 열차 각 역 정차로 운행을 재개하였습니다. 또한 현재 운행 시간이 지체되고 있습니다. 대체 수송을 시행하고 있습니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 대폭 지연되고 있으며 소요 시간이 길어지고 있습니다. 급한 용무가 있으신 경우에는 우회하여 승차하시길 바랍니다. 대체 수송을 시행하고 있습니다. 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 (일부 열차에서) 운행이 지연되고 있습니다. (대체 수송을 시행하고 있습니다) 불편을 끼쳐 드려 죄송합니다.","●, ■은 ▲에서 발생한 ★의 영향으로 일부 열차의 운행이 중단되었습니다. (대체 수송을 시행하고 있습니다) 불편을 끼쳐 드려 죄송합니다.","■선은 (상행・하행선에서) 지연되고 있습니다. 또한 소요 시간은 대체로 변경되지 않았습니다. (대체 수송을 시행하고 있습니다)","■은 ★의 영향으로 ★에 의한 운행이 예상됩니다. 열차가 대폭 지연되어 소요 시간이 늘어남에 따라 역이나 차내가 혼잡할 것으로 예상됩니다. 손님분들께 큰 불편을 끼쳐 드려 죄송합니다. 가능한 외출은 삼가시길 바라며 양해의 말씀을 드립니다.","■은 ★의 영향으로 통상의 {wari}할 정도로 운행되고 있습니다. 열차가 대폭 지연되어 소요 시간이 늘어남에 따라 역이나 차내가 혼잡할 것으로 예상됩니다. 손님분들께 큰 불편을 끼쳐 드려 죄송합니다. 가능한 외출은 삼가시길 바라며 양해의 말씀을 드립니다.","■은 ★의 영향으로 운행 시간이 지체되고 있습니다만 소요 시간은 대체로 변경되지 않았습니다. 불편을 끼쳐 드려 죄송합니다.","■ ▲은 ★의 영향으로 혼잡한 상태이며 ● 현재 입장을 규제하고 있습니다.\n손님분들께 큰 불편을 끼쳐 드려 죄송합니다. 가능한 외출은 삼가시길 바라며 양해의 말씀을 드립니다.","대체 운행은 ■、■、■등에서 실시되고 있습니다.","또한, 각 철도 회사의 대체 운송은 실시하지 않습니다.","또한, 대체운행은, ■를 포함한 정기권, 표,회수권을 가지고 계신 분만 사용 가능합니다.IC카드의 충전액(잔액)에 의한 이용은 대체 운행 이용이 불가하오니 양해 부탁드립니다.","일부 역에서는 플랫폼이 굉장히 혼잡하고 있습니다.안전을 확보하기 위해 역 개찰구에서 입장 제한을 시행하고 있습니다.","Ｓ－ＴＲＡＩＮ{num}호는 운행 정지중입니다.","또한, Ｑ－ＳＥＡＴ{num}호는 운행 정지를 위해 서비스를 중지합니다.","★의 영향으로 ● 안전 확보를 위해 ■은 운행 중지나 지연이 발생할 가능성이 있습니다. 이용시 주의해 주십시오.","항상 도큐선을 이용해주셔서 감사합니다.★의 영향으로 ● ★이/가 예상되고 있습니다.안전 운행 확보를 위해 ■은 운행 중지나 감속 운행을 하는 경우가 있어 평소보다 장시간이 소요될 가능성이 있습니다. 고객님들께서는 불편하시겠지만 시간적 여유를 가지고 외출해 주십시오.특히 ●에는 가능한 외출을 삼가시도록 부탁드리겠습니다.","항상 도큐선을 이용해주셔서 감사합니다.★의 영향으로 ● ★이/가 예상되고 있습니다.안전 운행 확보를 위해 ■은 운행이 중단될 가능성이 있습니다.또한, ●에서는 전 노선 감축 운행으로 인해 평소보다 장시간이 소요될 가능성이 있습니다.고객님들께서는 불편하시겠지만, 특히 ●에는 가능한 외출을 삼가시도록 부탁드리겠습니다.","★의 영향으로 ● 이후 안전 확보를 위해 ■은 순차적으로 운행을 중지합니다. 이용시 주의해 주십시오.","항상 도큐선을 이용해주셔서 감사합니다. ★에 따른 안전 운행 확보를 위해 ■은 막차 시간을 앞당겨 ●시 이후 순차적으로 운행을 중지합니다. 고객님들께서는 불편하시겠지만 양해해주시기를 부탁드립니다.","날씨 상황에 따라 예정보다 빨리 운행이 중단될 가능성이 있습니다.","■은 ★의 영향으로 감축 운행을 하고 있습니다.또한, ■은 ●를 끝으로 운행을 종료하겠습니다.대체 수송을 시행하고 있습니다.불편을 끼쳐 드려 대단히 죄송합니다.","■은▲을/를 ●에 발차하는 ○・▲행 열차가 마지막 열차입니다.","■은 ★의 영향으로 운행을 종료하였습니다. 불편을 끼쳐 드려 대단히 죄송합니다.","운행 정보","각 도큐선은, 평상시대로 운행하고 있습니다.","열차의 운행에 15분 이상의 지연, 운전 보류가 발생 혹은 예상되는 경우에는 운행 정보를 공지하고 있습니다.","노선명","역 입장 규제 정보","도큐선은 평상시대로 운행하고 있습니다.","메구로선은 평상시대로 운행하고 있습니다.","덴엔토시선은 평상시대로 운행하고 있습니다.","오이마치선은 평상시대로 운행하고 있습니다.","이케가미선은 평상시대로 운행하고 있습니다.","도큐 다마가와선은 평상시대로 운행하고 있습니다.","세타가야선은 평상시대로 운행하고 있습니다.","고도모노쿠니선은 평상시대로 운행하고 있습니다.","언제나 도큐선을 이용해주셔서 감사합니다. 현재 운행 정보의 표시에 문제가 발생하고 있습니다. 여러분께 불편함을 끼쳐 죄송합니다. 양해 부탁드립니다."]}return t.prototype.translate=function(t,e){for(var a=e.matches,n=this.templates[t],i=function(){var t=a[r],e=o.translateMatchedText(t);if(void 0!==e){var i=e.replace(/\\\d/g,function(e){return t.captures[e.slice(1)]}),s=o.findReplaceMarker(t);n=n.replace(s,i)}},o=this,r=0;r<a.length;++r)i();return n},t.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?" ("+e+")":this.markMap[t.name]||t.mark},t.prototype.translateMatchedText=function(t){if("between"===t.name){if(2===t.captureIndexes.length){var e=this.translations.station;return" "+e[t.captureIndexes[0]]+"~"+e[t.captureIndexes[1]]+" 사이"}return""}if("reason"===t.name){if(137===t.index)return this.translations.line[t.captureIndexes[0]]+"선으로 부터 대체수송 수탁";if(138===t.index)return this.translations.line[t.captureIndexes[0]]+"선 지연의 영향"}var a=this.fixedTranslations[t.name];return a?0===t.captures.length?"":" "+a:t.index>=0?"time"===t.name&&5===t.index?this.daysOfWeek[+t.captures[1]]+"요일 출퇴근 시간대":this.translations[t.name][t.index]:void 0},Object.defineProperty(t.prototype,"templates",{get:function(){return this.oldTemplates},enumerable:!0,configurable:!0}),t}();e.default=new n},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){this.markMap={between:new RegExp("(?:（?在▲和▲之间）?|(?:（?▲～▲之间）?))")},this.fixedTranslations={detour:"有急事的乘客请搭乘替换路线。",part_of_section:"部分车站之间",part_of_train:"部分电车",both:"在上行线、下行线",alternative:"现已实施替换路线转乘优惠。"},this.daysOfWeek=["周日","周一","周二","周三","周四","周五","周六"],this.translations={num:["\\1"],wari:["\\10%"],kind:["各站停车","急行","准急","通勤快速","特急"],time:["\\1点\\2分左右","\\1点以后","\\1月\\2日","\\1月\\2日晚间至\\3月\\4日","清晨至早高峰时段","星期\\1的通勤时段","今日","明日","次日早晨","台风接近时","台风最接近时","星期一","星期二","星期三","星期四","星期五","星期六","星期日","1月","2月","3月","4月","5月","6月","7月","8月","9月","10月","11月","12月"],line:["东横线","目黑线","田园都市线","大井町线","池上线","东急多摩川线","世田谷线","儿童之国线","港未来线","东急线全线","东急线各线","东急线全线、东急线的一部分或全线"],station:["涩谷站","代官山站","中目黑站","祐天寺站","学艺大学站","都立大学站","自由丘站","田园调布站","多摩川站","新丸子站","武藏小杉站","元住吉站","日吉站","纲岛站","大仓山站","菊名站","妙莲寺站","白乐站","东白乐站","反町站","横滨站","目黑站","不动前站","武藏小山站","西小山站","洗足站","大冈山站","奥泽站","田园调布站","多摩川站","新丸子站","武藏小杉站","元住吉站","日吉站","涩谷站","池尻大桥站","三轩茶屋站","驹泽大学站","樱新町站","用贺站","二子玉川站","二子新地站","高津站","沟之口站","梶谷站","宫崎台站","宫前平站","鹭沼站","多摩广场站","蓟野站","江田站","市尾站","藤丘站","青叶台站","田奈站","长津田站","土笔野站","铃悬台站","南町田站","月见野站","中央林间站","大井町站","下神明站","户越公园站","中延站","荏原町站","旗之台站","北千束站","大冈山站","绿丘站","自由丘站","九品佛站","尾山台站","等等力站","上野毛站","二子玉川站","沟之口站","五反田站","大崎广小路站","户越银座站","荏原中延站","旗之台站","长原站","洗足池站","石川台站","雪谷大冢站","御岳山站","久原站","千鸟町站","池上站","莲沼站","蒲田站","多摩川站","沼部站","鹈之木站","下丸子站","武藏新田站","矢口渡站","蒲田站","三轩茶屋站","西太子堂站","若林站","松阴神社前站","世田谷站","上町站","宫之坂站","山下站","松原站","下高井户站","长津田站","恩田站","儿童之国站","新高岛站","港未来站","马车道站","日本大道站","元町・中华街站"],reason:["人身事故","抢救紧急病患","乘客坠落轨道","乘客触碰列车","乘客救护","乘客纠纷","乘客问题处理","车辆检查","站台安全确认","有人误入轨道","有人滞留平交道","车辆滞留平交道","列车于平交道与汽车发生碰撞","列车于平交道与动物发生碰撞","人多拥挤","部分列车过于拥挤","乘客行李掉落轨道","乘客身体被车门夹住","乘客行李被车门夹住","影响他人的行为","轨道内异常声响确认","平交道内异常声响确认","异常声响确认","车辆确认","车辆检查","车辆故障","车门确认","车门检查","车门故障","车辆玻璃破损","车辆破损","轨道上有障碍物","轨道(铁轨)损坏","轨道路基被冲走","轨道安全确认","轨道检查","轨道故障","轨道内确认、检查","道岔安全检查","道岔检查","道岔故障","铁道设备的确认、检查","安全装置确认","安全装置检查","安全装置故障","信号确认","信号检查","信号故障","接收紧急停车信号","平交道安全确认","平交道检查  ","平交道装置故障","平交道事故","站台门确认","站台门检查","站台门故障","车站设备的确认、检查","漂浮铝箔气球处理","架线上有障碍物","架线故障","供电确认","停电","供电设备的确认、检查","列车撞击事故","列车脱轨事故","列车火灾","列车干扰","地震","雷击","台风","低气压","强风","大雨","雪","积雪","大雾","塌方","树木倒塌","铁路沿线火灾","基础结构确认、检查","大雨","强风","降雪","大雪","低气压接近","确保降雪时安全行驶","南岸低气压接近","台风\\1号接近","大雨及强风","台风接近引起的大雨・强风","车内紧急按钮的警报","紧急停车按钮警报","轨道内有人闯入引起警报","车内清扫","乘客过于接近列车","车内给别人造成困扰的行为","对车辆的恶作剧行为","有人闯入铁道用地","乘客的伞掉落入轨道","车辆发生异常声响","车辆故障","更换故障车辆","门开启故障","窗户玻璃破损","车辆窗户玻璃破损","车门故障","车辆安全确认","轨道内行李掉落","轨道内物品掉落","轨道内异常声响的原因确认","轨道内树木倒塌","轨道内出现烟雾","轨道内火灾","轨道塌陷","铁道用地出现烟雾","铁道用地火灾","信号确认","信号设备故障的恢复工作","信号装置故障","信号灯故障","接收列车紧急停止信号","道岔故障","站台闸门感应故障","站台闸门开闭故障","设备故障","车站设备故障","可疑物品确认","站台栅栏感应不灵","站台栅栏感应故障","电气设备故障","由于架线断裂","架线检查","架线与树枝缠绕","车站内停电","供电故障","乘务员身体不适","发生乘务员身体不适","承接从\\1线的转乘服务","由于\\1线的延迟影响","与小动物发生的触碰","与障碍物发生的触碰","设备障碍","龙卷风产生的影响","由于强风引起的限速","由于大雨引起的限速","大雨和强风的影响","由于降雪引起的限速","冻结路面的轨道确认","伴随台风接近引起的限速","由于大雪引起的限速","车内异常声响确认"]},this.newTemplates=["●，■，由于在▲发生★，所以（在▲和▲之间）暂停运行。","电车预计在●恢复运行。","由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将在▲～▲之间往返运行。","现已实施替换路线转乘优惠。","电车预计恢复运行时间原定于●，但由于★，时间将变更为●。","●，■，由于在▲发生★的影响，列车将在（▲～▲之间）暂停运行。","现在相关负责人正在调查事故原因，将于●左右公布电车预计恢复运行时间。","请您搭乘其他列车路线。","●，■，由于在▲发生★的影响，列车将在（部分车站之间）暂停运行，但在●，列车已恢复运行。","目前电车出现延迟的情况。","（有急事的乘客请搭乘替换路线。）","●，■，由于在▲发生★的影响，列车将在（部分车站之间）暂停运行，全部列车已于●以各站停车的方式恢复运行。","●，■，由于在▲发生★的影响，电车出现严重延迟的情况，乘车时间也将有所增加。","有急事的乘客请搭乘其他列车路线。","●，■，由于在▲发生★的影响，列车将（部分电车）出现延迟的情况。","（现已实施替换路线转乘优惠。）","●，■，由于在▲发生★的影响，部分列车出现停止运行的情况。","■，（在上行线、下行线）出现延迟的情况。","但所需乘车时间与往常基本相同。","■，由于★的影响，预计列车将会以★来运行。","除列车的严重延迟与所造成的乘车时间增加等情况外，预计将在车站及车厢内发生严重拥挤。","由此给您带来不便。","出行请尽量避免搭乘本线，感谢您的谅解。","■，由于★的影响列车正以正常速度的{wari}进行运行。","■，由于★的影响造成列车运行时刻混乱，但所需乘车时间与往常基本相同。","■▲，由于★的影响所造成的拥挤情况，将于●实行入场管制。","可于■、■以及■等线进行替换路线优惠。","另外，现在各铁路公司没有实施替换路线转乘优惠。","另外，仅供持有通过■的定期券、普通车票、回数券的顾客乘坐替换路线转乘并享受优惠。","使用IC卡余额的顾客无法享受替换路线转乘优惠，我们深表歉意，敬请谅解。","一部分车站的站台正处于非常拥挤的状态。","为了确保您的人身安全，我们已在检票口进行进站管制。","S-TRAIN{num}号停止运行中。","另外由于Q-SEAT{num}号停止运行，我们将中止服务。","因受到★的影响，为确保列车运行安全，■可能出现延迟或暂停运行的状况。","乘车时请注意相关通知。","非常感谢您搭乘东急线。","因受到★的影响，●，预计将会出现★。","为确保列车运行安全，■会出现列车暂停运行或限速运行的状况，乘车所需时间可能会延长。","给您造成诸多不便我们深表歉意，请合理安排出行时间。","特别注意●时，请尽可能避免搭乘本线出行。","为确保列车运行安全，■可能会出现列车停止运行的状况。","另外，从●开始由于列车运行班次减少，乘车所需时间可能会相应延长。","给您造成诸多不便我们深表歉意， 但请注意●时，请尽可能避免搭乘本线出行。","因受到★的影响，从●起，为确保安全，■将暂停发车。","因★，为确保列车运行安全，■末班车将提前至●并不再发车。","给您造成诸多不便我们深表歉意，敬请谅解。","根据天气情况列车可能会提前停运。","■因受到★的影响，已减少列车运行班次。","另外，■将于●结束运行。","现已实施替换路线转乘优惠。","给您造成诸多不便，我们深表歉意。","■将于●由▲发车，○・▲方向的列车为末班车。","受到★的影响，■列车现已终止运行。","运行信息","东急各线正常运行中。","列车若发生15分钟以上的延迟或者暂停运行的情况时，我们将会向您通报运行信息及预计再运行时间。","路线名","进站管制信息","东横线正常运行中。","目黑线正常运行中。","田园都市线正常运行中。","大井町线正常运行中。","池上线正常运行中。","东急多摩川线正常运行中。","世田谷线正常运行中。","儿童之国线正常运行中。","现在，运行信息的显示发生了问题。","给您带来不便我们深感抱歉，敬请谅解。"],this.oldTemplates=["●，■，由于在▲发生★，所以（在▲和▲之间）暂停运行。电车预计在●恢复运行。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将在▲～▲之间往返运行。电车预计在●恢复运行。现已实施替换路线转乘优惠。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将在▲～▲之间往返运行。电车预计恢复运行时间原定于●，但由于★，时间将变更为●。现已实施替换路线转乘优惠。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将在（▲～▲之间）暂停运行。现在相关负责人正在调查事故原因，将于●公布电车预计恢复运行时间。请您搭乘其他列车路线。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★，列车将在（▲～▲之间）暂停运行。现在相关负责人正在调查事故原因，将于●公布电车预计恢复运行时间。请您搭乘其他列车路线。现已实施替换路线转乘优惠。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将在（部分车站之间）暂停运行，但在●，列车已恢复运行。目前电车出现延迟的情况。（有急事的乘客请搭乘替换路线。）现已实施替换路线转乘优惠。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将在（部分车站之间）暂停运行，全部列车已于●以各站停车的方式恢复运行。目前电车出现延迟的情况。现已实施替换路线转乘优惠。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，电车出现严重延迟的情况，乘车时间也将有所增加。有急事的乘客请搭乘其他列车路线。现已实施替换路线转乘优惠。由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，列车将（部分电车）出现延迟的情况。（现已实施替换路线转乘优惠。）由此给您带来不便我们深表歉意。","●，■，由于在▲发生★的影响，部分列车出现停止运行的情况。（现已实施替换路线转乘优惠。）由此给您带来不便我们深表歉意。","■，（在上行线、下行线）出现延迟的情况。但所需乘车时间与往常基本相同。（现已实施替换路线转乘优惠。）","■，由于★的影响，预计列车将会以★来运行。除列车的严重延迟与所造成的乘车时间增加等情况外，预计将在车站及车厢内发生严重拥挤。由此给您带来不便。出行请尽量避免搭乘本线，感谢您的谅解。","■，由于★的影响列车正以正常速度的{wari}进行运行。除列车的严重延迟与所造成的乘车时间增加等情况外，预计将在车站及车厢内发生严重拥挤。由此给您带来不便。出行请尽量避免搭乘本线，感谢您的谅解。","■，由于★的影响造成列车运行时刻混乱，但所需乘车时间与往常基本相同。由此给您带来不便我们深表歉意。","■▲，由于★的影响所造成的拥挤情况，将于●实行入场管制。由此给您带来不便。出行请尽量避免搭乘本线，感谢您的谅解。","■、■、■等線免費轉乘服務實施中。","另外，現在各鐵路公司並未提供免費轉乘服務。","另外，免費轉乘服務僅供持有包含■之月票、一般車票、回數票的旅客使用。使用IC卡內儲值金額的旅客恕無法使用免費轉乘服務，感謝您的諒解。","部分車站月台目前非常擁擠。為確保安全，剪票口將實施進站管制。","S-TRAIN{num}號停止運行。","另外因Q-SEAT{num}號停止運行，服務將中止。","受到★的影響，●，為確保運行安全，■可能會延遲或暫停行駛。乘車時請注意相關資訊。","感謝各位旅客搭乘東急線。因★的影響，●，預計會★。為確保運行安全，■將暫停行駛或是降低列車行駛速度，可能造成旅客乘車時間增加。請旅客預留足夠時間出門，造成您的不便，敬請見諒。特別在●，請盡可能避免搭乘本線。","感謝各位旅客搭乘東急線。因★的影響，●，預計會★。為確保運行安全，■有可能暫停行駛。另外，因●開始減少運行班次，預計將造成旅客乘車時間增加。特別在●，請盡可能避免搭乘本線，造成您的不便，敬請見諒。","因★的影響，為確保安全，●以後■將不再發車。乘車時請注意相關資訊。","感謝各位旅客搭乘東急線。因★的影響，為確保運行安全，■的末班車時間將提早為●，之後不再發車。造成您的不便，敬請諒解。","有可能因天氣狀況而提早停止運行。","■因★的影響，已減少運行班次。另外，■將於●後停止運行。免費轉乘服務實施中。造成您的不便，我們深感抱歉。","■的末班車為●從▲發車，往▲方向的○。","■因受到★的影響已停止運行。造成您的不便，我們深感抱歉。","运行信息","东急各线正常运行中。","列车若发生15分钟以上的延迟或者暂停运行的情况时，我们将会向您通报运行信息及预计再运行时间。","路线名","进站管制信息","东横线正常运行中。","目黑线正常运行中。","田园都市线正常运行中。","大井町线正常运行中。","池上线正常运行中。","东急多摩川线正常运行中。","世田谷线正常运行中。","儿童之国线正常运行中。","非常感谢您搭乘东急线。现在，运行信息的显示发生了问题。给您带来不便我们深感抱歉，敬请谅解。"]}return t.prototype.translate=function(t,e){for(var a=e.matches,n=this.templates[t],i=function(){var t=a[r],i=o.translateMatchedText(t,e);if(void 0!==i){var s=i.replace(/\\\d/g,function(e){return t.captures[e.slice(1)]}),u=o.findReplaceMarker(t);n=n.replace(u,s)}},o=this,r=0;r<a.length;++r)i();return n},t.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?"（"+e+"）":this.markMap[t.name]||t.mark},t.prototype.translateMatchedText=function(t,e){if("between"===t.name){if(2===t.captureIndexes.length){var a=this.translations.station,n=a[t.captureIndexes[0]],i=a[t.captureIndexes[1]];return 0===e.index?"在"+n+"和"+i+"之间":n+"～"+i+"之间"}return""}if("reason"===t.name){if(137===t.index)return"承接从"+this.translations.line[t.captureIndexes[0]]+"的转乘服务";if(138===t.index)return"由于"+this.translations.line[t.captureIndexes[0]]+"的延迟影响"}var o=this.fixedTranslations[t.name];return o?0===t.captures.length?"":o:t.index>=0?"time"===t.name&&5===t.index?"星期"+this.daysOfWeek[+t.captures[1]]+"的通勤时段":this.translations[t.name][t.index]:void 0},Object.defineProperty(t.prototype,"templates",{get:function(){return this.newTemplates},enumerable:!0,configurable:!0}),t}();e.default=new n},function(t,e,a){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var a in e)e.hasOwnProperty(a)&&(t[a]=e[a])};return function(e,a){function n(){this.constructor=e}t(e,a),e.prototype=null===a?Object.create(a):(n.prototype=a.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.markMap={between:new RegExp("（?(ระหว่าง|ส่งผลให้รถไฟทำการวิ่งแค่) ▲ ～ ▲）?")},e.fixedTranslations={detour:"สำหรับผู้โดยสารที่ต้องการความรวดเร็วขอความกรุณาในการหลีกเลี่ยงเส้นทางดังกล่าว",part_of_section:"ในบางสถานี",part_of_train:"ในบางสถานี",both:"ทั้งขาเข้า-ขาออก",alternative:"จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง"},e.daysOfWeek=["อา.","จ.","อ.","พ.","พฤ.","ศ.","ส."],e.translations={num:["\\1"],wari:["\\10%"],kind:["รถธรรมดา(จอดทุกป้าย)","รถด่วน","รถไฟกึ่งรถด่วน","รถด่วนความเร็วสูง","รถไฟด่วนพิเศษ"],time:["เวลาประมาณ \\1:\\2 น.","หลังจาก \\1:00 น.","วันที่\\2เดือน\\1","ช่วงเย็นของวันที่\\2เดือน\\1 ถึงวันที่\\4เดือน\\3","ตั้งแต่ช่วงเช้าตรู่จนถึงช่วงเวลาเร่งด่วนในตอนเช้า","ช่วงเวลาเร่งด่วนของวัน\\1","วันนี้","วันพรุ่งนี้","วันพรุ่งนี้ตอนเช้า","เมื่อพายุเข้ามาใกล้","เมื่อพายุเข้ามาในระยะประชิด","วันจันทร์","วันอังคาร","วันพุธ","วันพฤหัสบดี","วันศุกร์","วันเสาร์","วันอาทิตย์","มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"],line:["รถไฟสาย Tōyoko","รถไฟสาย Meguro","รถไฟสาย Den-en-toshi","รถไฟสาย Ōimachi","รถไฟสาย Ikegami","รถไฟสาย Tōkyū Tamagawa","รถไฟสาย Setagaya","รถไฟสาย Kodomonokuni","รถไฟสาย Minatomirai","รถไฟสาย Tokyu ทั้งหมด","รถไฟสาย Tokyu ทั้ั้งหมด","รถไฟสาย Tokyu บางส่วนหรือทั้งหมด"],station:["สถานี Shibuya","สถานี Daikan-yama","สถานี Naka-meguro","สถานี Yūtenji","สถานี Gakugei-daigaku","สถานี Toritsu-daigaku","สถานี Jiyūgaoka","สถานี Den-en-chōfu","สถานี Tamagawa","สถานี Shin-maruko","สถานี Musashi-kosugi","สถานี Motosumiyoshi","สถานี Hiyoshi","สถานี Tsunashima","สถานี Ōkurayama","สถานี Kikuna","สถานี Myōrenji","สถานี Hakuraku","สถานี Higashi-hakuraku","สถานี Tammachi","สถานี Yokohama","สถานี Meguro","สถานี Fudō-mae","สถานี Musashi-koyama","สถานี Nishi-koyama","สถานี Senzoku","สถานี Ōokayama","สถานี Okusawa","สถานี Den-en-chōfu","สถานี Tamagawa","สถานี Shin-maruko","สถานี Musashi-kosugi","สถานี Motosumiyoshi","สถานี Hiyoshi","สถานี Shibuya","สถานี Ikejiri-ōhashi","สถานี Sangen-jaya","สถานี Komazawa-daigaku","สถานี Sakura-shimmachi","สถานี Yōga","สถานี Futako-tamagawa","สถานี Futako-shinchi","สถานี Takatsu","สถานี Mizonokuchi","สถานี Kajigaya","สถานี Miyazakidai","สถานี Miyamaedaira","สถานี Saginuma","สถานี Tama-plaza","สถานี Azamino","สถานี Eda","สถานี Ichigao","สถานี Fujigaoka","สถานี Aobadai","สถานี Tana","สถานี Nagatsuta","สถานี Tsukushino","สถานี Suzukakedai","สถานี Minami-machida","สถานี Tsukimino","สถานี Chūō-rinkan","สถานี Ōimachi","สถานี Shimo-shimmei","สถานี Togoshi-kōen","สถานี Nakanobu","สถานี Ebara-machi","สถานี Hatanodai","สถานี Kita-senzoku","สถานี Ōokayama","สถานี Midorigaoka","สถานี Jiyūgaoka","สถานี Kuhombutsu","สถานี Oyamadai","สถานี Todoroki","สถานี Kaminoge","สถานี Futako-tamagawa","สถานี Mizonokuchi","สถานี Gotanda","สถานี Ōsakihirokōji","สถานี Togoshi-ginza","สถานี Ebara-nakanobu","สถานี Hatanodai","สถานี Nagahara","สถานี Senzoku-ike","สถานี Ishikawa-dai","สถานี Yukigaya-ōtsuka","สถานี Ontakesan","สถานี Kugahara","สถานี Chidorichō","สถานี Ikegami","สถานี Hasunuma","สถานี Kamata","สถานี Tamagawa","สถานี Numabe","สถานี Unoki","สถานี Shimomaruko","สถานี Musashi-nitta","สถานี Yaguchi-no-watashi","สถานี Kamata","สถานี Sangen-jaya","สถานี Nishi-taishidō","สถานี Wakabayashi","สถานี Shōin-jinja-mae","สถานี Setagaya","สถานี Kamimachi","สถานี Miyanosaka","สถานี Yamashita","สถานี Matsubara","สถานี Shimo-takaido","สถานี Nagatsuta","สถานี Onda","สถานี Kodomonokuni","สถานี Shin-takashima","สถานี Minatomirai","สถานี Bashamichi","สถานี Nihon-ōdōri","สถานี Motomachi-Chūkagai"],reason:["อุบัติเหตุรถไฟชนคน","ทำการช่วยเหลือผู้ป่วยกระทันหัน","ผู้โดยสารตกลงไปบนรางรถไฟ","ผู้โดยสารกระแทกกับรถไฟที่แล่นอยู่","ช่วยผู้โดยสารที่ต้องการความช่วยเหลือ","ปัญหาระหว่างผู้โดยสาร","ให้การข่วยเหลือแก่ผู้โดยสาร","ตรวจสอบภายในตัวรถ","ตรวจสอบความปลอดภัยบนชานชาลา","ผู้บุกรุกเข้าไปในรางรถไฟ","คนข้ามไม่พ้นทางข้ามรถไฟ","รถยนต์ติดอยู่ในทางข้ามรถไฟ","รถไฟชนกับรถยนต์ในทางข้ามรถไฟ","รถไฟชนกับสัตว์ในทางข้ามรถไฟ","ผู้โดยสารแออัด","ผู้โดยสารแออัดในรถไฟบางขบวน","สิ่งของของผู้โดยสารตกลงไปบนรางรถไฟ","ประตูหนีบร่างกายผู้โดยสาร","ประตูหนีบสิ่งของของผู้โดยสาร","การรบกวนหรือสร้างความรำคาญ","ตรวจสอบเสียงผิดปกติที่รางรถไฟ","ตรวจสอบเสียงผิดปกติที่ทางข้ามรถไฟ","ตรจสอบเสียงผิดปกติ","ตรวจสอบตัวรถไฟ","ตรวจเช็คตัวรถไฟ","รถไฟเสีย","ตรวจสอบประตู","ตรวจเช็คประตู","ประตูเสีย","กระจกหน้าต่างรถไฟแตก","ตัวรถไฟเสียหาย","สิ่งของตกอยู่บนรางรถไฟ","รางรถไฟขาด","หินโรยทางทรุด","ตรวจสอบความปลอดภัยของรางรถไฟ","ตรวจเช็ครางรถไฟ","รางรถไฟเสียหาย","ตรวจสอบและตรวจเช็ครางรถไฟ","ตรวจสอบความปลอดภัยทางแยกราง","ตรวจเช็คทางแยกราง","ทางแยกรางเสีย","ตรวจสอบและตรวจเช็คอาคารสถานที่เกี่ยวกับรถไฟ","ตรวจสอบเครื่องมือเพื่อความปลอดภัย","ตรวจเช็คเครื่องมือเพื่อความปลอดภัย","เครื่องมือเพื่อความปลอดภัยเสีย","ตรวจสอบสัญญาณรถไฟ","ตรวจเช็คสัญญาณรถไฟ","สัญญาณรถไฟเสีย","ได้รับสัญญาณแจ้งหยุดรถฉุกเฉิน","ตรวจสอบความปลอดภัยทางข้ามรถไฟ","ตรวจเช็คทางข้ามรถไฟ","ทางข้ามรถไฟเสีย","อุบัติเหตุที่ทางข้ามรถไฟ","ตรวจสอบประตูที่ชานชาลา","ตรวจเช็คประตูที่ชานชาลา","ประตูที่ชานชาลาเสีย","ตรวจสอบและตรวจเช็คอุปกรณ์สถานี","เก็บลูกโป่งที่ทำจากฟอยล์","มีสิ่งกีดขวางติดที่สายไฟเหนือทางรถไฟ","สายไฟเหนือทางรถไฟเสียหาย","ตรวจสอบการส่งไฟฟ้า","ไฟดับ","ตรวจสอบและตรวจเช็คอุปกรณ์เกี่ยวกับไฟฟ้า","อุบัติเหตุรถไฟชนกัน","อุบัติเหตุรถไฟตกราง","ไฟไหม้รถไฟ","ถูกกีดขวางการเดินรถ","แผ่นดินไหว","ฟ้าผ่า","พายุไต้ฝุ่น","ความกดอากาศต่ำ","ลมกรรโชกแรง","ฝนตกหนัก","หิมะตก","หิมะตกทับสะสม","หมอกลงหนา","ดินถล่ม","ต้นไม้ล้ม","ไฟไหมใกล้ทางรถไฟ","ตรวจสอบและตรวจเช็คโครงสร้างทางรถไฟ","ฝนตกหนัก","ลมกรรโชกแรง","หิมะตก","หิมะตกหนัก","กลุ่มความกดอากาศต่ำเข้าใกล้","เดินรถด้วยความปลอดภัยเมื่อหิมะตก","กลุ่มความกดอากาศต่ำชายฝั่งทางใต้เข้าใกล้","พายุไต้ฝุ่นหมายเลข \\1 กำลังจะมาถึง","ฝนตกหนักหรือลมกรรโชกแรง","ฝนตกหนักหรือลมกรรโชกแรงเนื่องจากพายุไต้ฝุ่นกำลังจะมาถึง","มีผู้กดปุ่มแจ้งเหตุฉุกเฉินในรถไฟ","มีผู้กดปุ่มหยุดรถฉุกเฉิน","มีผู้แจ้งเหตุบุคคลบุกรุกเข้าไปในทางรถไฟ","ทำความสะอาดภายในตัวรถ","ผู้โดยสารเข้าใกล้รถไฟที่กำลังแล่น","การรบกวนหรือสร้างความรำคาญในรถไฟ","การทำลายทรัพย์สินในรถไฟ","มีผู้บุกรุกเข้าไปในพื้นที่การรถไฟ","ร่มของผู้โดยสารตกลงไปบนทางรถไฟ","เสียงผิดปกติที่ตัวรถไฟ","ความผิดปกติที่ตัวรถไฟ","เปลี่ยนรถเนื่องจากความผิดปกติที่ตัวรถไฟ","ประตูทำงานผิดปกติ","กระจกหน้าต่างแตก","กระจกหน้าต่างรถไฟแตก","ประตูรถไฟทำงานผิดปกติ","ตรวจสอบความปลอดภัยของรถไฟ","สิ่งของของผู้โดยสารตกลงไปบนรางรถไฟ","มีของตกอยู่บนรางรถไฟ","ตรวจหาสาเหตุเสียงผิดปกติที่ทางรถไฟ","ต้นไม้ล้มในทางรถไฟ","มีควันที่รางรถไฟ","ไฟไหม้ที่รางรถไฟ","รางทรุด","มีควันในพื้นที่การรถไฟ","ไฟไหม้ในพื้นที่การรถไฟ","ตรวจสอบสัญญาณรถไฟ","ซ่อมแซมความเสียหายของอุปกรณ์สัญญาณเดินรถ","อุปกรณ์สัญญาณเดินรถเสีย","เครื่องให้สัญญาณเดินรถเสีย","ได้รับสัญญาณแจ้งให้หยุดรถฉุกเฉิน","อุปกรณ์ทางแยกรางทำงานผิดปกติ","เซนเซอร์ประตูชานชาลาทำงานผิดปกติ","ประตูชานชาลาทำงานผิดปกติ","อุปกรณ์มีปัญหา","อุปกรณ์เสียหายที่สถานี","ตรวจสอบสิ่งของต้องสงสัย","เซนเซอร์รั้วบนชานชาลาทำงานผิดปกติ","เซนเซอร์รั้วบนชานชาลาเสีย","อุปกรณ์ไฟฟ้าทำงานผิดปกติ","เนื่องจากสายไฟเหนือรางขาด","ตรวจเช็คสายไฟเหนือราง","กิ่งไม้ติดอยู่ที่สายไฟเหนือราง","ไฟดับที่สถานี","ปัญหาการส่งไฟฟ้า","พนักงานบนรถไม่สบาย","มีพนักงานบนรถไม่สบาย","มีการรับช่วงผู้โดยสารจากรถไฟสาย \\1","ได้รับผลกระทบจากความล่าช้าของรถไฟสาย \\1","รถไฟชนกับสัตว์ขนาดเล็ก","รถไฟชนกับสิ่งของที่ตกอยู่บนรางรถไฟ","อุปกรณ์มีปัญหา","ได้รับผลกระทบจากทอร์นาโด","จำกัดความเร็วเนื่องจากมีลมกรรโชกแรง","จำกัดความเร็วเนื่องจากฝนตกหนัก","ได้รับผลกระทบจากฝนตกหนักและลมกรรโชกแรง","จำกัดความเร็วเนื่องจากหิมะตก","ตรวจสอบรางรถไฟเนื่องจากอุณหภูมิต่ำจนกลายเป็นน้ำแข็ง","จำกัดความเร็วเนื่องจากพายุไต้ฝุ่นกำลังจะมาถึง","จำกัดความเร็วเนื่องจากหิมะตกหนัก","ตรวจสอบเสียงผิดปกติในรถไฟ"]},e.templates=["เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ เป็นเหตุให้รถไฟหยุดให้บริการ（ระหว่าง ▲ ～ ▲）ซึ่งทางเราจะทำการเปิดให้บริการอีกครั้งเมื่อ ● จึงเรียนมาเพื่อโปรดทราบ และขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟทำการวิ่งแค่ ▲ ～ ▲ ซึ่งทางเราจะทำการเปิดให้บริการเต็มรูปแบบอีกครั้งเมื่อ ● จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟทำการวิ่งแค่ ▲ ～ ▲ ซึ่งทางเราจะทำการเปิดให้บริการเต็มรูปแบบอีกครั้งในเวลาประมาณ ● แต่เนื่องจาก ★ อาจเป็นเหตุให้มีการเปลี่ยนแปลงเวลาเปิดทำการ ● ข้างต้น จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟหยุดให้บริการ（ระหว่าง ▲ ～ ▲）อนึ่ง ขณะนี้ทางเรากำลังดำเนินการหาสาเหตุโดยเจ้าหน้าที่ผู้เชี่ยวชาญเฉพาะ ซึ่งทางเราจะทำการแจ้งให้ทราบถึงกำหนดการเปิดให้บริการอีกครั้งในเวลาประมาณ ● จึงขอความกรุณาในการหลีกเลี่ยงเส้นทางดังกล่าว และขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ เป็นเหตุให้รถไฟหยุดให้บริการ（ระหว่าง ▲ ～ ▲）อนึ่ง ขณะนี้ทางเรากำลังดำเนินการหาสาเหตุโดยเจ้าหน้าที่ผู้เชี่ยวชาญเฉพาะ ซึ่งทางเราจะทำการแจ้งให้ทราบถึงกำหนดการเปิดให้บริการอีกครั้งในเวลาประมาณ ● จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทางและหลีกเลี่ยงเส้นทางดังกล่าว ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟหยุดให้บริการ（ในบางสถานี）แต่ได้ทำการเปิดให้บริการอีกครั้งเมื่อ ● อนึ่ง ความล่าช้าที่เกิดขึ้นในขณะนี้เป็นผลให้ตารางการเดินรถไฟล่าช้ากว่ากำหนด（สำหรับผู้โดยสารที่ต้องการความรวดเร็วขอความกรุณาในการหลีกเลี่ยงเส้นทางดังกล่าว） จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟหยุดให้บริการ（ในบางสถานี）แต่สำหรับรถไฟสายอื่นเราได้ทำการเปิดให้บริการอีกครั้งเมื่อ ● อนึ่ง ขณะนี้รถไฟไม่สามารถให้บริการได้ตรงตามกำหนดเวลาที่ตั้งไว้ จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟใช้เวลาในการให้บริการมากขึ้นและล่าช้ากว่ากำหนดเวลาที่ตั้งไว้ สำหรับผู้โดยสารที่ต้องการความรวดเร็วขอความกรุณาในการหลีกเลี่ยงเส้นทางดังกล่าว จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้เกิดความล่าช้าในการเดินรถไฟ（ในบางสถานี）（จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง）ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เมื่อ ● รถไฟสาย ■ ▲ เนื่องจาก ★ ส่งผลให้รถไฟหยุดให้บริการในบางสถานี（จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง）ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","รถไฟสาย ■ เกิดความล่าช้าในการเดินรถไฟ（ทั้งขาเข้า-ขาออก）อนึ่ง รถไฟยังคงเปิดให้บริการตามปกติ（จึงขอความร่วมมือจากผู้โดยสารในการเปลี่ยนเส้นทางในการเดินทาง）","เนื่องด้วย ★ ส่งผลให้รถไฟสาย ■ ทั้งในสถานีและบนรถไฟมีจำนวนผู้ใช้บริการอย่างหนาแน่น ซึ่งคาดว่าเกิดจาก ★ ส่งผลให้รถไฟใช้เวลาในการให้บริการมากขึ้นและล่าช้ากว่ากำหนดเวลาที่ตั้งไว้ ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้ และขอความกรุณาในการหลีกเลี่ยงเส้นทางดังกล่าว","เนื่องจาก ★ ส่งผลให้รถไฟสาย ■ สามารถใช้ความเร็วในการวิ่งได้ {wari} ซึ่งคาดการณ์ว่าทั้งในสถานีและบนรถไฟจะมีจำนวนผู้ใช้บริการอย่างหนาแน่น ส่งผลให้รถไฟใช้เวลาในการให้บริการมากขึ้นและล่าช้ากว่ากำหนดเวลาที่ตั้งไว้ จึงขอความกรุณาผู้โดยสารในการหลีกเลี่ยงเส้นทางดังกล่าว","เนื่องจาก ★ ส่งผลให้รถไฟสาย ■ ไม่สามารถให้บริการได้ตรงตามกำหนดเวลาที่ตั้งไว้ แต่รถไฟยังคงเปิดให้บริการตามปกติ ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เนื่องจาก ★ ส่งผลให้รถไฟสาย ■ ▲ มีความแออัดของผู้ใช้บริการมากจนเกินไป ทางเราจึงต้องทำการจำกัดจำนวนผู้ที่สามารถเข้าสู่ภายในตัวสถานีได้ตั้งแต่ ● ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้ และขอความกรุณาในการหลีกเลี่ยงเส้นทางดังกล่าว"," สามารถเปลี่ยนไปใช้บริการรถไฟสาย ■, ■, ■ ได้","โปรดทราบ ผู้โดยสารไม่สามารถทำการใช้บริการรถไฟของผู้ให้บริการอื่นได้","โปรดทราบ สำหรับผู้โดยสารที่ต้องการใช้บริการรถไฟของผู้ให้บริการอื่นสามารถทำได้โดยใช้ตั๋วรถไฟปกติ, ตั๋วเที่ยว หรือตั๋วเดือน ควบคู่ไปกับ ■แต่สำหรับจะไม่สามารถใช้ร่วมกับบัตร IC การ์ดได้ ซึ่งทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","เนื่องจากความแออัดของผู้คนในบางสถานีเพื่อความปลอดภัยของผู้โดยสาร ทางเราจึงได้ทำการจำกัดจำนวนผู้โดยสารขาเข้าที่ทางเข้าชานชะลา","Ｓ－ＴＲＡＩＮ หมายเลข {num} งดให้บริการ","นอกจากนี้ จะทำการยกเลิก Ｑ－ＳＥＡＴ หมายเลข {num} ที่งดให้บริการ","เนื่องจาก ★ ส่งผลให้รถไฟสาย ■ อาจหยุดให้บริการหรือเกิดความล่าช้าในการให้บริการในช่วง ● เพื่อความปลอดภัยในการให้บริการโปรดระมัดระวังในการใช้บริการ","ขอขอบคุณที่ใช้บริการรถไฟสาย Tokyu เนื่องจาก★คาดการณ์ว่า ● จะ★เพื่อความปลอดภัยในการให้บริการ ■ ทางเราจึงขอเลื่อนเวลาในการปิดให้บริการเร็วกว่าปกติ โดยจะเริ่มทำการปิดให้บริการตั้งแต่ ● จึงเรียนมาเพื่อโปรดทราบ และขออภัยในความไม่สะดวกมา ณ ที่นี้","ขอขอบคุณที่ใช้บริการรถไฟสาย Tokyu เนื่องจาก★คาดการณ์ว่า ● จะ★เพื่อความปลอดภัยในการให้บริการ ■ ทางเราจึงขอทำการยกเลิกการให้บริการซึ่ง ● รถไฟที่ให้บริการจะมีจำนวนลดลงจากปกติ และจะใช้เวลาในการเดินทางมากกว่าปกติทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้ทางเราขอความร่วมมือผู้โดยสารในการงดเว้นการเดินทาง ● ","เนื่องจาก ★ ส่งผลให้ตั้งแต่ ● รถไฟ ■ ทำการหยุดให้บริการ เพื่อความปลอดภัยในการใช้งานจึงเรียนมาเพื่อโปรดทราบ และโปรดระมัดระวังในการใช้บริการ","ขอขอบคุณที่ใช้บริการรถไฟสาย Tokyu เพื่อความปลอดภัยในการให้บริการ เนื่องจาก ★ การให้บริการรถไฟสาย ■ จะทำการปิดให้บริการเร็วกว่าปกติ โดยรถไฟขบวนสุดท้ายจะอยู่ช่วง ● หลังจากนั้นจะทำการปิดให้บริการจึงเรียนมาเพื่อโปรดทราบ และขออภัยในความไม่สะดวกมา ณ ที่นี้","อาจจะมีการยกเลิกการให้บริการเร็วกว่าปกติ ขึ้นอยู่กับสภาพภูมิอากาศ","เนื่องจาก ★ ส่งผลให้รถไฟสาย ■ มีจำนวนในการให้บริการลดน้อยลง และรถไฟสาย ■ จะหยุดให้บริการภายใน ●จึงเรียนมาเพื่อโปรดทราบ และขออภัยในความไม่สะดวกมา ณ ที่นี้","รถไฟ○สาย ■  ออกจากสถานี▲ตอน ● ไป▲เป็นรถไฟขบวนสุดท้าย","เนื่องจาก ★ ส่งผลให้รถไฟสาย ■ ถูกยกเลิก ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้","ข้อมูลการเดินรถ","รถไฟทุกขบวนของ Tokyu Line เปิดให้บริการตามปกติ","ทางเราจะทำการแจ้งให้ผู้โดยสารทราบเมื่อรถไฟเกิดการล่าช้าเกิน 15 นาที, หยุดชะงัก หรือหยุดให้บริการ","เส้นทางการเดินรถ","ข้อมูลวิธีการปฏิบัติในการเข้าสู่สถานี","รถไฟทุกขบวนของ Tōyoko Line เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Meguro Line เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Den-en-toshi เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Ōimachi Line เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Ikegami Line เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Tōkyū Tamagawa Line เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Setagaya Line เปิดให้บริการตามปกติ","รถไฟทุกขบวนของ Kodomonokuni Line เปิดให้บริการตามปกติ","ขอบคุณที่ใช้บริการรถไฟสาย Tokyu linesเราไม่สามารถระบุสถานะของรถไฟได้ในขณะนี้ ทางเราต้องขออภัยในความไม่สะดวกมา ณ ที่นี้"],e}return n(e,t),e.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?"（"+e+"）":this.markMap[t.name]||t.mark},e.prototype.translateMatchedText=function(t,e){if("between"===t.name){if(2===t.captureIndexes.length){var a=this.translations.station,n=a[t.captureIndexes[0]],i=a[t.captureIndexes[1]];return 1==e||2==e?"ส่งผลให้รถไฟทำการวิ่งแค่"+n+" ～ "+i:"ระหว่าง"+n+" ～ "+i}return""}if("reason"===t.name){if(137===t.index)return"มีการรับช่วงผู้โดยสารจากรถไฟสาย "+this.translations.line[t.captureIndexes[0]];if(138===t.index)return"มีการรับช่วงผู้โดยสารจากรถไฟสาย "+this.translations.line[t.captureIndexes[0]]}var o=this.fixedTranslations[t.name];return o?0===t.captures.length?"":" "+o:t.index>=0?"time"===t.name&&5===t.index?"ช่วงเวลาเร่งด่วนของวัน"+this.daysOfWeek[+t.captures[1]]:this.translations[t.name][t.index]:void 0},e}(a(13).AbstractRuleBaseTranslation);e.default=new i},function(t,e,a){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var a in e)e.hasOwnProperty(a)&&(t[a]=e[a])};return function(e,a){function n(){this.constructor=e}t(e,a),e.prototype=null===a?Object.create(a):(n.prototype=a.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.markMap={between:new RegExp(" \\(?de la ▲ hasta la ▲\\)?")},e.fixedTranslations={detour:"Las personas que tengan prisa por favor abordar trenes por vías alternas.",part_of_section:"en una parte del tramo",part_of_train:"en algunos trenes",both:"en las líneas de ida y venida",alternative:"Se están efectuando transbordos por medio de otras compañías ferroviarias."},e.daysOfWeek=["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"],e.translations={wari:["\\10%"],num:["\\1"],kind:["parada en cada estación","expreso","semi-expreso","rápido de ida al trabajo","expreso especial"],time:["alrededor de la(s) \\1 y \\2 minuto(s)","a partir de la(s) \\1:00","mes de \\1 del día \\2","desde la noche del mes de \\1 del día \\2 hasta el mes de \\3 del día \\4","durante la madrugada hasta la hora pico de la mañana","el día \\1 durante la hora de ida al trabajo","hoy","mañana","mañana por la mañana","al momento de aproximarse un tifón","al momento de aproximación máxima de un tifón","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"],line:["la línea Tōyoko","la línea Meguro","la línea Den-en-toshi","la línea Ōimachi ","la línea Ikegami","la línea Tōkyū Tamagawa","la línea Setagaya","la línea Kodomonokuni ","la línea Minatomirai ","Todas las lineas de tren de Tokyu","Todas las lineas de tren de Tokyu","Todas o algunas de las lineas de tren de Tokyu"],station:["estación de Shibuya","estación de Daikan-yama","estación de Naka-meguro","estación de Yūtenji","estación de Gakugei-daigaku","estación de Toritsu-daigaku","estación de Jiyūgaoka","estación de Den-en-chōfu","estación de Tamagawa","estación de Shin-maruko","estación de Musashi-kosugi","estación de Motosumiyoshi","estación de Hiyoshi","estación de Tsunashima","estación de Ōkurayama","estación de Kikuna","estación de Myōrenji","estación de Hakuraku","estación de Higashi-hakuraku","estación de Tammachi","estación de Yokohama","estación de Meguro","estación de Fudō-mae","estación de Musashi-koyama","estación de Nishi-koyama","estación de Senzoku","estación de Ōokayama","estación de Okusawa","estación de Den-en-chōfu","estación de Tamagawa","estación de Shin-maruko","estación de Musashi-kosugi","estación de Motosumiyoshi","estación de Hiyoshi","estación de Shibuya","estación de Ikejiri-ōhashi","estación de Sangen-jaya","estación de Komazawa-daigaku","estación de Sakura-shimmachi","estación de Yōga","estación de Futako-tamagawa","estación de Futako-shinchi","estación de Takatsu","estación de Mizonokuchi","estación de Kajigaya","estación de Miyazakidai","estación de Miyamaedaira","estación de Saginuma","estación de Tama-plaza","estación de Azamino","estación de Eda","estación de Ichigao","estación de Fujigaoka","estación de Aobadai","estación de Tana","estación de Nagatsuta","estación de Tsukushino","estación de Suzukakedai","estación de Minami-machida","estación de Tsukimino","estación de Chūō-rinkan","estación de Ōimachi","estación de Shimo-shimmei","estación de Togoshi-kōen","estación de Nakanobu","estación de Ebara-machi","estación de Hatanodai","estación de Kita-senzoku","estación de Ōokayama","estación de Midorigaoka","estación de Jiyūgaoka","estación de Kuhombutsu","estación de Oyamadai","estación de Todoroki","estación de Kaminoge","estación de Futako-tamagawa","estación de Mizonokuchi","estación de Gotanda","estación de Ōsakihirokōji","estación de Togoshi-ginza","estación de Ebara-nakanobu","estación de Hatanodai","estación de Nagahara","estación de Senzoku-ike","estación de Ishikawa-dai","estación de Yukigaya-ōtsuka","estación de Ontakesan","estación de Kugahara","estación de Chidorichō","estación de Ikegami","estación de Hasunuma","estación de Kamata","estación de Tamagawa","estación de Numabe","estación de Unoki","estación de Shimomaruko","estación de Musashi-nitta","estación de Yaguchi-no-watashi","estación de Kamata","estación de Sangen-jaya","estación de Nishi-taishidō","estación de Wakabayashi","estación de Shōin-jinja-mae","estación de Setagaya","estación de Kamimachi","estación de Miyanosaka","estación de Yamashita","estación de Matsubara","estación de Shimo-takaido","estación de Nagatsuta","estación de Onda","estación de Kodomonokuni","estación de Shin-takashima","estación de Minatomirai","estación de Bashamichi","estación de Nihon-ōdōri","estación de Motomachi-Chūkagai"],reason:["accidente corporal","socorro a paciente de urgencia","caída de usuario en las vías del tren","usuario fue golpeado por el tren","socorro a un usuario","problema entre usuarios","atención a un usuario","verificación del interior del tren","verificación de la seguridad sobre la plataforma","ingreso de persona a las vías del tren","persona aún cruzando en del paso a nivel","automóvil paralizado en el paso a nivel","automóvil fue golpeado por el tren en el paso a nivel","animal fue golpeado por el tren el paso a nivel","congestión","congestión concentrada en algunos trenes","el equipaje de un usuario se cayó en las vías del tren","el cuerpo de un usuario se atascó en una puerta","el equipaje de un usuario se atascó en una puerta","conductas molestas","verificación de sonido anómalo en las vías del tren","verificación de sonido anómalo en el paso a nivel","verificación de sonido anómalo","verificación de vagón","inspección de vagón","avería de vagón","verificación de puerta","inspección de puerta","avería de puerta","quiebre de vidrio del vagón","quiebre del vagón","obstáculo en las vías del tren","ruptura de los rieles del tren","salida del balasto","verificación de la seguridad de las vías del tren.","inspección de las vías del tren","avería de las vías del tren","verificación/inspección dentro de las vías del tren.","verificación de la seguridad de los cambiavías","inspección de los cambiavías","avería de los cambiavías","verificación/inspección de la instalación de las vías ferroviarias","verificación de los dispositivos de seguridad","inspección de los dispositivos de seguridad","avería de los dispositivos de seguridad","verificación de las señales","inspección de las señales","avería de las señales","recepción de señal de parada de emergencia","verificación de la seguridad en el paso a nivel","inspección del paso a nivel","avería en el paso a nivel","accidente en el paso a nivel","verificación de puerta de andén","inspección de puerta de andén","avería de puerta de andén","verificación/inspección del equipamiento de la estación","despeje de globo de aluminio flotante","obstáculo en la catenaria","avería en la catenaria","verificación del suministro eléctrico","corte del suministro eléctrico","verificación / inspección de los equipos eléctricos","accidente de colisión de tren","accidente de descarrilamiento de tren","incendio de tren","obstaculización del paso del tren","terremoto","caída de rayo","tifón","ciclón","vientos fuertes","lluvias torrenciales","nieve","acumulación de nieve","niebla espesa","corrimiento de tierras","árbol caído","incendio a lo largo de la vía ferroviaria","verificación e inspección de estructuras","lluvias torrenciales","vientos fuertes","nevada","gran nevada","aproximación de un ciclón","garantizando la seguridad del recorrido a causa de la nevada","aproximación de un ciclón por la costa sur","aproximación del tifón nº \\1","lluvias torrenciales y vientos fuertes","lluvias torrenciales/vientos fuertes por aproximación de tifón","notificación por el botón de emergencia dentro del tren","notificación por el botón de parada de emergencia","se informó sobre el ingreso de persona en las vías del tren","limpieza del interior del tren","un usuario se acercó al tren","conductas molestas dentro del tren","se realizó una travesura en contra de los vagones","ingreso de persona al terreno ferroviario","el paraguas de un usuario se cayó en las vías del tren","detección de sonido anómalo en un vagón","mal funcionamiento de un vagón","sustitución de vagón por mal funcionamiento","mal funcionamiento de la apertura de puerta","quiebre de vidrio de una ventana","quiebre de vidrio de una ventana del vagón","mal funcionamiento de la puerta del vehículo.","verificación de la seguridad del vagón","caída de equipaje en las vías del tren","caída de objeto perdido en las vías del tren","verificación de la causa de sonido anómalo en las vías del tren","un árbol caído en las vías del tren","humo saliendo de las vías del tren","incendio en las vías del tren","hundimiento de las vías del tren","salida de humo en el terreno ferroviario","incendio en el terreno ferroviario","verificación de las señales","trabajos de reparación de avería de equipo de señal","avería de dispositivo de señal","avería de semáforo","recepción de señal que causa al tren hacer una parada de emergencia","mal funcionamiento de dispositivo de cambiavías","mal funcionamiento del sensor de puerta de andén","mal funcionamiento de la apertura y cierre de puerta de andén","problemas con las instalaciones","averías en las instalaciones de la estación","verificación de objeto sospechoso","mal funcionamiento del sensor de la valla de la plataforma","avería del sensor de la valla de la plataforma","mal funcionamiento de equipo eléctrico","debido a que hubo un corte en la catenaria","inspección de la catenaria","una rama de árbol se enganchó en la catenaria","corte del suministro eléctrico en el recinto de la estación","problemas con el suministro eléctrico","mala condición física de personal a bordo","se ha generado una mala condición física de personal a bordo","encargo de transferencia de la línea \\1","a consecuencia de un retraso de la línea \\1","choque con un animal pequeño","choque con un obstáculo","problemas con las instalaciones","a consecuencia de haberse generado un remolino de viento","regulación de la velocidad por vientos fuertes","regulación de la velocidad debido a lluvias torrenciales","a consecuencia de lluvias torrenciales y vientos fuertes","regulación de la velocidad por nevada","verificación de las vías del tren por motivo de congelación","regulación de la velocidad debido a la aproximación de un tifón","regulación de la velocidad por gran nevada","verificación de sonido anómalo dentro del tren"]},e.templates=["Debido a ★ en la ▲, ●, ■ ha suspendido sus servicios de trenes (de la ▲ hasta la ▲). Se prevé que los servicios de trenes se reanuden ●. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, ■ estará prestando servicios de trenes únicamente en el tramo de la ▲ hasta la ▲. Se prevé que los servicios de trenes se reanuden ●. Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, ■ estará prestando servicios de trenes únicamente en el tramo de la ▲ hasta la ▲. El tiempo de reanudación de los servicios de trenes se había previsto para ●, sin embargo debido a ★, el tiempo previsto cambió para ●. Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, ■ ha suspendido sus servicios de trenes (de la ▲ hasta la ▲). Ahora bien, en este momento un encargado especialista está investigando la causa, y se tiene pautado informar el tiempo previsto de reanudación de servicios de trenes ●. Por favor abordar trenes por vías alternas. Les pedimos disculpas por las molestias causadas.","Debido a ★ en la ▲, ●, ■ ha suspendido sus servicios de trenes (de la ▲ hasta la ▲). Ahora bien, en este momento un encargado especialista está investigando la causa, y se tiene pautado informar el tiempo previsto de reanudación de los servicios de trenes ●. Por favor abordar trenes por vías alternas. Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, ■ había suspendido sus servicios de trenes (en una parte del tramo). Sin embargo ●, se reanudaron los servicios de trenes. Ahora bien, en este momento hay retrasos. (Las personas que tengan prisa por favor abordar trenes por vías alternas.) Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, ■ había suspendido sus servicios de trenes (en una parte del tramo). Sin embargo ●, se reanudaron los servicios de todos los trenes deteniéndose en cada estación. Ahora bien, actualmente los horarios están alterados. Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, en ■ hay retrasos significativos y están aumentando los tiempos necesarios del recorrido. Las personas que tengan prisa por favor abordar trenes por vías alternas. Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, en ■ están ocurriendo retrasos (en algunos trenes). (Se están efectuando transbordos por medio de otras compañías ferroviarias.) Les pedimos disculpas por las molestias causadas.","A consecuencia de ★ en la ▲, ●, en ■ algunos trenes no estarán prestando servicios. (Se están efectuando transbordos por medio de otras compañías ferroviarias.) Les pedimos disculpas por las molestias causadas.","En ■ hay retrasos (en las líneas de ida y venida). Ahora bien los tiempos necesarios del recorrido son en general como de costumbre. (Se están efectuando transbordos por medio de otras compañías ferroviarias.)","En ■, a consecuencia de ★ se tiene previsto prestar servicios de trenes a través de ★. A causa de los retrasos significativos y el aumento de los tiempos necesarios del recorrido, se esperan grandes congestiones en las estaciones y adentro de los trenes. Les estamos causando grandes molestias a los usuarios. Les pedimos su comprensión para que se abstengan de ir en tren hasta su destino.","En ■, a consecuencia de ★ se prestarán servicios de trenes a un {wari} ciento de lo normal. A causa de los retrasos significativos y el aumento de los tiempos necesarios del recorrido, se esperan grandes congestiones en las estaciones y adentro de los trenes. Les estamos causando grandes molestias a los usuarios. Les pedimos su comprensión para que se abstengan de ir en tren hasta su destino.","En ■, aunque a consecuencia de ★ los horarios estén alterados, los tiempos necesarios del recorrido son en general como de costumbre. Les pedimos disculpas por las molestias causadas.","Por la congestión a consecuencia de ★, actualmente ● se está regulando el acceso a la ▲ de ■. Les estamos causando grandes molestias a los usuarios. Les pedimos su comprensión para que se abstengan de ir en tren hasta su destino.","Hay traslados disponibles a través de ■, ■ y ■.","Tenga en cuenta que no se proporcionarán rutas de traslado alternativas.","Tenga en cuenta que los traslados a través de rutas alternativas pueden ser gratuitos para aquellos pasajeros con boletos regulares, boletos de viajes múltiples y pases de viajero frecuente que incluyen traslados en ■. Los pasajeros con tarjetas IC no pueden trasladarse de manera gratuita. Le pedimos disculpas por las molestias ocasionadas.","Actualmente, las plataformas en algunas estaciones están muy llenas. Para garantizar la seguridad de los pasajeros, la entrada a estas estaciones en las puertas de las entradas está restringida.","El servicio {num} de TREN S se ha suspendido.","Además, el servicio {num} de ASIENTO Q se ha suspendido y está fuera de servicio.","A consecuencia de ★, a la(s) ●, para garantizar la seguridad en la línea ■, existe la posibilidad de que se suspendan los servicios de trenes o que hayan retrasos. Por favor tenga cuidado al usar los servicios de trenes.","A consecuencia de ★, a la(s) ● se espera que ★ Para garantizar un recorrido seguro, en la línea ■, podrían suspenderse los servicios de trenes o el recorrido podría realizarse con servicios de trenes a baja velocidad, por lo cual es posible que el tiempo necesario del recorrido tarde mucho más de lo normal. Les estamos causando grandes molestias a los usuarios, pero les pedimos que vayan a su lugar de destino con holgura de tiempo. En la medida de lo posible por favor abstenerse de ir en tren, especialmente a la(s) ●.","A consecuencia de ★, a la(s) ● se espera que ★ Para garantizar un recorrido seguro, es posible que en la línea ■, se suspendan los servicios de trenes. Además, debido a que se está haciendo el recorrido con un número reducido de servicios de trenes en todas las líneas a la(s) ●, está previsto que los tiempos necesarios del recorrido sean prolongados. Les estamos causando grandes molestias a los usuarios, pero en la medida de lo posible por favor abstenerse de ir en tren especialmente a la(s) ●.","A consecuencia de ★, a partir de la(s) ●, para garantizar la seguridad en la línea ■, se suspenderán por orden los servicios de trenes. Por favor tenga cuidado al usar los servicios de tren.","Les agradecemos sinceramente por utilizar siempre la línea Tokyū. A causa de ★, para garantizar un recorrido seguro, en la línea ■ se adelantará la hora del último tren y a partir de la(s) ● se suspenderán por orden los servicios de trenes. Les estamos causando grandes molestias a los usuarios, pero les pedimos sinceramente su comprensión.","Existe la posibilidad que previo al impacto de condiciones climáticas se suspendan los servicios de trenes.","A consecuencia de ★, en la línea ■ se hará el recorrido con un número reducido de servicios de trenes. Además, en la línea ■ se finalizarán los servicios de trenes teniendo como objetivo a la(s) ●. Se están efectuando transbordos por medio de otras compañías ferroviarias. Les pedimos perdón por las molestias causadas.","En la línea ■ en la ▲ cuando el tren (tipo) ○・sale en dirección a la ▲ a la(s) ●, es el último tren.","A consecuencia de ★, en la línea ■ se finalizaron los servicios de trenes. Les pedimos perdón por las molestias causadas.","Información del estado de los trenes","Todos los trenes de las líneas de Tokyu están funcionando con normalidad.","Cuando los trenes se retrasen por más de 15 minutos, o cuando los trenes se hayan suspendidos o se espere una suspensión, se brindará información al respecto.","Rutas","Información de acceso a la estación de tren","Los trenes de la línea Tōyoko están funcionando con normalidad.","Los trenes de la línea Meguro están funcionando con normalidad.","Los trenes de la línea Den-en-toshi están funcionando con normalidad.","Los trenes de la línea Ōimachi están funcionando con normalidad.","Los trenes de la línea Ikegami están funcionando con normalidad.","Los trenes de la línea Tōkyū Tamagawa están funcionando con normalidad.","Los trenes de la línea Setagaya están funcionando con normalidad.","Los trenes de la línea Kodomonokuni están funcionando con normalidad.","Gracias por utilizar las líneas de trenes Tokyu.  En este momento, no podemos brindarle información del estado de los trenes. Le pedimos disculpas por las molestias ocasionadas y le agradecemos por su comprensión."],e}return n(e,t),e.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?" ("+e+")":this.markMap[t.name]||t.mark},e.prototype.translateMatchedText=function(t){if("between"===t.name){if(2===t.captureIndexes.length){var e=this.translations.station;return" de la "+e[t.captureIndexes[0]]+" hasta la "+e[t.captureIndexes[1]]}return""}if("reason"===t.name){if(137===t.index)return"encargo de transferencia de la línea "+this.translations.line[t.captureIndexes[0]];if(138===t.index)return"a consecuencia de un retraso de la línea "+this.translations.line[t.captureIndexes[0]]}var a=this.fixedTranslations[t.name];return a?0===t.captures.length?"":" "+a:t.index>=0?"time"===t.name&&5===t.index?"el día "+this.daysOfWeek[+t.captures[1]]+" durante la hora de ida al trabajo":this.translations[t.name][t.index]:void 0},e}(a(13).AbstractRuleBaseTranslation);e.default=new i},function(t,e,a){"use strict";var n=this&&this.__extends||function(){var t=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(t,e){t.__proto__=e}||function(t,e){for(var a in e)e.hasOwnProperty(a)&&(t[a]=e[a])};return function(e,a){function n(){this.constructor=e}t(e,a),e.prototype=null===a?Object.create(a):(n.prototype=a.prototype,new n)}}();Object.defineProperty(e,"__esModule",{value:!0});var i=function(t){function e(){var e=null!==t&&t.apply(this,arguments)||this;return e.markMap={between:new RegExp(" \\(?entre les gares de ▲ et ▲\\)?")},e.fixedTranslations={detour:"Veuillez emprunter une ligne alternative si vous êtes pressé.",part_of_section:"sur une partie du parcours",part_of_train:"pour une partie des trains",both:"dans les deux sens",alternative:"Le transfert des passagers est actuellement assuré sur une autre ligne."},e.daysOfWeek=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"],e.months=["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],e.translations={num:["\\1"],wari:["\\10%"],kind:["train local","train express","train semi express","train de banlieue express","train limited express"],time:["à/de \\1h \\2 environ","après \\1h",null,null,"de tôt le matin jusqu'à la fin de l'heure de pointe","aux heures de pointe du \\1","aujourd'hui","demain","demain matin","lors de l'approche d'un typhon","lors d'un typhon à proximité immédiate","lundi","mardi","mercredi","jeudi","vendredi","samedi","dimanche","janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"],line:["la ligne Tōyoko","la ligne Meguro","la ligne Den-en-toshi","la ligne Ōimachi ","la ligne Ikegami","la ligne Tōkyū Tamagawa","la ligne Setagaya","la ligne Kodomonokuni ","la ligne Minatomirai ","toutes les lignes Tokyu","toutes les lignes Tokyu","certaines ou toutes les lignes Tokyu"],station:["la station Shibuya","la station Daikan-yama","la station Naka-meguro","la station Yūtenji","la station Gakugei-daigaku","la station Toritsu-daigaku","la station Jiyūgaoka","la station Den-en-chōfu","la station Tamagawa","la station Shin-maruko","la station Musashi-kosugi","la station Motosumiyoshi","la station Hiyoshi","la station Tsunashima","la station Ōkurayama","la station Kikuna","la station Myōrenji","la station Hakuraku","la station Higashi-hakuraku","la station Tammachi","la station Yokohama","la station Meguro","la station Fudō-mae","la station Musashi-koyama","la station Nishi-koyama","la station Senzoku","la station Ōokayama","la station Okusawa","la station Den-en-chōfu","la station Tamagawa","la station Shin-maruko","la station Musashi-kosugi","la station Motosumiyoshi","la station Hiyoshi","la station Shibuya","la station Ikejiri-ōhashi","la station Sangen-jaya","la station Komazawa-daigaku","la station Sakura-shimmachi","la station Yōga","la station Futako-tamagawa","la station Futako-shinchi","la station Takatsu","la station Mizonokuchi","la station Kajigaya","la station Miyazakidai","la station Miyamaedaira","la station Saginuma","la station Tama-plaza","la station Azamino","la station Eda","la station Ichigao","la station Fujigaoka","la station Aobadai","la station Tana","la station Nagatsuta","la station Tsukushino","la station Suzukakedai","la station Minami-machida","la station Tsukimino","la station Chūō-rinkan","la station Ōimachi","la station Shimo-shimmei","la station Togoshi-kōen","la station Nakanobu","la station Ebara-machi","la station Hatanodai","la station Kita-senzoku","la station Ōokayama","la station Midorigaoka","la station Jiyūgaoka","la station Kuhombutsu","la station Oyamadai","la station Todoroki","la station Kaminoge","la station Futako-tamagawa","la station Mizonokuchi","la station Gotanda","la station Ōsakihirokōji","la station Togoshi-ginza","la station Ebara-nakanobu","la station Hatanodai","la station Nagahara","la station Senzoku-ike","la station Ishikawa-dai","la station Yukigaya-ōtsuka","la station Ontakesan","la station Kugahara","la station Chidorichō","la station Ikegami","la station Hasunuma","la station Kamata","la station Tamagawa","la station Numabe","la station Unoki","la station Shimomaruko","la station Musashi-nitta","la station Yaguchi-no-watashi","la station Kamata","la station Sangen-jaya","la station Nishi-taishidō","la station Wakabayashi","la station Shōin-jinja-mae","la station Setagaya","la station Kamimachi","la station Miyanosaka","la station Yamashita","la station Matsubara","la station Shimo-takaido","la station Nagatsuta","la station Onda","la station Kodomonokuni","la station Shin-takashima","la station Minatomirai","la station Bashamichi","la station Nihon-ōdōri","la station Motomachi-Chūkagai"],reason:["d'un accident de personne","d'une urgence médicale à bord d'un train","d'une chute d'un voyageur sur la voie","d'un voyageur entré en contact avec un train","d'un voyageur ayant reçu des secours","d'un incident entre des voyageurs","d'un problème avec un voyageur","d'un contrôle dans un train","d'un contrôle de sécurité sur un quai","d'une intrusion sur la voie","d'un voyageur resté à l'intérieur d'un passage à niveau","d'un véhicule coincé à un passage à niveau","d'une collision avec un véhicule à un passage à niveau","d'une collision avec un animal à un passage à niveau","d'une surcharge de voyageurs","d'une surcharge de voyageurs dans certains trains","d'un objet personnel tombé sur la voie","d'un passager coincé dans les portes d'un train","d'un objet personnel coincé dans les portes d'un train","d'une conduite malveillante d'un voyageur","d'un contrôle relatif à un bruit anormal sur la voie","d'un contrôle relatif à un bruit anormal à un passage à niveau","d'un contrôle relatif à un bruit anormal","d'un contrôle d'un train","d'une inspection d'un train","d'une panne d'un train","d'un contrôle des portes","d'une inspection des portes","d'une panne des portes","d'une vitre de train cassée","d'un train endommagé","d'un obstacle sur la voie","d'un rail endommagé","d'un écoulement du ballast","d'un contrôle de sécurité de la voie","d'une inspection de la voie","d'une voie endommagée","d'un contrôle/inspection de la voie","d'un contrôle de sécurité d'un aiguillage","d'une inspection d'un aiguillage","d'un aiguillage endommagé","d'un contrôle/inspection d'un aménagement ferroviaire","d'un contrôle d'un équipement de sécurité","d'une inspection d'un équipement de sécurité","d'une panne d'un équipement de sécurité","d'un contrôle d'un signal","d'une inspection d'un signal","d'une panne d'un signal","d'un signal d'arrêt d'urgence","d'un contrôle de sécurité à un passage à niveau","d'une inspection d'un passage à niveau","d'une panne d'un passage à niveau","d'un accident à un passage à niveau","d'un contrôle d'une porte de quai","d'une inspection d'une porte de quai","d'une panne d'une porte de quai","d'un contrôle/inspection d'un aménagement d'une gare","de l'élimination d'un ballon en aluminium","d'un objet pris dans une caténaire","d'une panne d'une caténaire","d'un contrôle de l'alimentation électrique","d'une panne de courant","d'un contrôle/vérification d'un équipement électrique","d'une collision entre des trains","d'un déraillement","d'un incendie dans un train","d'un acte de vandalisme dans un train","d'un séisme","de la foudre","d'un typhon","d'une dépression atmosphérique","de vents violents","de pluies importantes","de la neige","de l'accumulation de neige","d'un brouillard épais","d'un glissement de terrain","d'une chute d'arbre","d'un incendie sur la voie","d'un contrôle/inspection d'une structure","de pluies importantes","de vents violents","de chutes de neige","de fortes chutes de neige","de l'approche d'une dépression atmosphérique","de la circulation ralentie à cause des chutes de neige","de l'approche d'une dépression atmosphérique sur la côte sud","de l'approche du typhon no \\1","de pluies importantes et vents violents","de pluies importantes et vents violents dus au typhon en approche","de l'actionnement du bouton d'urgence dans un train","de l'actionnement d'un bouton d'arrêt d'urgence","d'un signalement d'une intrusion sur la voie","d'un nettoyage à l'intérieur d'un train","d'un incident avec un voyageur s'étant approché d'un train en mouvement","d'une conduite malveillante dans un train","d'un acte de vandalisme sur un train","d'une intrusion dans une installation ferroviaire","d'un parapluie d'un voyageur tombé sur la voie","de la détection d'un bruit anormal dans un train","d'une défaillance d'un wagon","d'un changement de wagon dû à une défaillance","d'un dysfonctionnement d'une porte","d'une vitre cassée","d'une vitre de train cassée","d'un dysfonctionnement d'une porte de train","d'un contrôle de sécurité d'un train","d'un objet personnel tombé sur la voie","d'un objet tombé sur la voie","d'un contrôle suite à un bruit anormal sur la voie","d'un arbre tombé sur la voie","d'une fumée sur la voie","d'un incendie sur la voie","d'un affaissement de la voie","d'une fumée dans une installation ferroviaire","d'un incendie dans une installation ferroviaire","d'un contrôle d'un signal","de travaux de réparation d'un équipement de signalisation","d'une panne d'un dispositif de signalisation","d'une panne d'un signal","d'un signal ayant obligé un train à s'arrêter d'urgence","d'une défaillance d'un aiguillage","d'une défaillance d'un capteur de porte de quai","d'une défaillance dans l'ouverture/fermeture d'une porte de quai","d'un problème d'un équipement","d'une panne d'un équipement d'une gare","d'un contrôle d'un objet suspect","d'une défaillance d'un capteur de barrière de quai","d'une panne d'un capteur de barrière de quai","d'une défaillance d'un équipement électrique","d'une caténaire rompue","d'une inspection d'une caténaire","d'un arbre pris dans une caténaire","d'une panne de courant dans une gare","d'un problème dans la fourniture électrique","d'un malaise d'un agent de train","d'un malaise d'un agent de train","de la demande de transfert des voyageurs \\1","de retards sur la ligne \\1","d'une collision avec un petit animal","d'une collision avec un obstacle","d'un problème au niveau d'un équipement","d'une tornade","d'un abaissement de la vitesse dû aux vents violents","d'un abaissement de la vitesse dû aux pluies importantes","de pluies importantes et des vents violents","d'un abaissement de la vitesse dû aux chutes de neige","d'un contrôle de la voie dû au gel","d'un abaissement de la vitesse dû à l'approche d'un typhon","d'un abaissement de la vitesse dû aux fortes chutes de neige","d'un contrôle relatif à un bruit anormal dans un train"]},e.templates=["●, sur ■, à la suite ★ à la gare ▲, la circulation des trains est suspendue (entre les gares de ▲ et ▲). La circulation devrait être rétablie aux alentours de ●. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, un service de navette est en place entre les gares de ▲ et ▲. La circulation devrait être rétablie aux alentours ●. Le transfert des passagers est actuellement assuré. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, un service de navette est en place entre les gares de ▲ et ▲. Il était prévu de rétablir la circulation des trains aux alentours de ●, mais en raison ★, celle-ci est reportée aux alentours de ●. Le transfert des passagers est actuellement assuré sur une autre ligne. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, la circulation des trains est suspendue (entre les gares de ▲ et ▲). Le personnel spécialisé étant en train d’enquêter sur la cause du problème, l’heure de rétablissement de la circulation devrait être annoncée aux alentours de ●. Nous vous prions d’utiliser une ligne alternative. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, la circulation des trains est suspendue (entre les gares de ▲ et ▲). Le personnel spécialisé étant en train d’enquêter sur la cause du problème, l’heure de rétablissement de la circulation devrait être annoncée aux alentours de ●. Nous vous prions d’utiliser une ligne alternative. Le transfert des passagers est actuellement assuré sur une autre ligne. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, la circulation des trains était suspendue (sur une partie du parcours), mais elle a été rétablie à ●. Les trains circulent néanmoins encore avec du retard. (Veuillez emprunter une ligne alternative si vous êtes pressé.) Le transfert des passagers est actuellement assuré sur une autre ligne. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, la circulation des trains était suspendue (sur une partie du parcours), mais la circulation de tous les trains locaux a été rétablie à ●. Les horaires subissent néanmoins encore des perturbations. Le transfert des passagers est actuellement assuré sur une autre ligne. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, des retards importants allongent considérablement la durée des trajets. Si vous êtes pressé, veuillez emprunter une ligne alternative. Le transfert des passagers est actuellement assuré sur une autre ligne. Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, des retards se produisent (pour une partie des trains). (Le transfert des passagers est actuellement assuré sur une autre ligne.) Veuillez nous excuser pour tout désagrément causé.","●, sur ■, à la suite ★ à la gare ▲, la circulation d'une partie des trains est suspendue. (Le transfert des passagers est actuellement assuré sur une autre ligne.) Veuillez nous excuser pour tout désagrément causé.","Des retards se produisent sur ■ (dans les deux sens). Toutefois, la durée des trajets est presque normale. (Le transfert des passagers est actuellement assuré sur une autre ligne.)","sur ■, en raison ★, (des) ★ est/sont attendu(es). Les trains risquent d’être fortement en retard et la durée des trajets peut être grandement allongée. Les gares et les wagons risquent également d’être saturés. Veuillez nous excuser pour tout désagrément causé. Nous sollicitons votre compréhension et vous demandons d’éviter de sortir.","sur ■, en raison ★, environ {wari} des trains habituels sont en circulation. Les trains risquent d’être fortement en retard et la durée des trajets peut être grandement allongée. Les gares et les wagons risquent également d’être saturés. Veuillez nous excuser pour tout désagrément causé. Nous sollicitons votre compréhension et vous demandons d’éviter de sortir.","sur ■, en raison ★, des perturbations dans l’horaire se produisent, mais la durée des trajets est presque normale. Veuillez nous excuser pour tout désagrément causé.","sur ■ à la gare ▲, à cause d’une saturation de voyageurs à la suite ★, l’accès à la gare est limité à cette heure ●. Veuillez nous excuser pour tout désagrément causé. Nous sollicitons votre compréhension et vous demandons d’éviter de sortir.","Des correspondances sont possibles via ■, ■ et ■.","Veuillez noter qu'il n'existe pas d'autre correspondance.","Veuillez noter que les changements de correspondance seront gratuits pour les passagers possédant un tiquet régulier, un tiquet multicourses ou un abonnement incluant ■. Les passagers utilisant des cartes IC ne peuvent pas changer de correspondance gratuitement. Veuillez nous excuser pour la gêne occasionnée.","Les plateformes de certaines stations sont actuellement extrêmement bondées. Pour assurer la sécurité des passagers, l'accés à ces stations est limité à l'entrée.","Le service S-TRAIN {num} a été arrêté.","Aussi, le service Q-SEAT {num} a été arrêté et n'est actuellement pas disponible.","En raison ★ et afin d'assurer la sécurité, ●, des suspensions dans la circulation des trains ou des retards peuvent se produire sur ■. Veuillez vérifier l'état de la circulation avant vos déplacements.","Nous vous remercions d'utiliser les lignes Tokyu pour vos déplacements. En raison ★, ●, ★ est/sont attendu(es). Afin d'assurer la sécurité, la circulation des trains peut être suspendue ou la vitesse des trains peut être abaissée sur ■ (lignes ferroviaires). La durée des trajets risque ainsi d'être allongée de façon conséquente. Veuillez vous assurer d'avoir suffisamment de temps à disposition pour vos déplacements. Plus particulièrement ●, veuillez dans la mesure du possible éviter de sortir.","Nous vous remercions d'utiliser les lignes Tokyu pour vos déplacements. En raison ★, ●, ★ est/sont attendu(es). Afin d'assurer la sécurité, il se peut que des trains soient annulés sur ■. En outre, ●, les trains circuleront en nombre réduit sur l'ensemble des lignes et la durée des trajets devrait ainsi être allongée de façon conséquente. Plus particulièrement ●, veuillez dans la mesure du possible éviter de sortir.","En raison ★, à partir ●, la circulation des trains sera progressivement annulée pour des raisons de sécurité sur ■. Veuillez vérifier l'état de la circulation avant vos déplacements.","Nous vous remercions d'utiliser les lignes Tokyu pour vos déplacements. En raison ★ et afin d'assurer la sécurité sur ■, le départ des derniers trains sera avancé. La circulation des trains sera progressivement annulée à partir de ●h. Nous sollicitons votre compréhension et vous prions de nous excuser pour tout désagrément causé.","Selon les conditions météorologiques, la circulation des trains peut être annulée plus tôt que l'heure indiquée.","Sur ■, à la suite ★, le nombre de trains en circulation a été réduit. En outre, sur ■, il est prévu que les trains cessent de circuler ●. Le transfert des passagers est actuellement assuré sur une autre ligne. Veuillez nous excuser pour tout désagrément causé.","Sur ■, le ○ partant de ▲ à ● à destination de ▲ sera le dernier train à circuler.","Sur ■, la circulation des trains est terminée en raison ★. Veuillez nous excuser pour tout désagrément causé.","Information sur le traffic des trains","Tous les trains des lignes Tokyu circulent normalement.","Les informations seront affichées en cas de retard supérieur à 15 minutes, d'annulation de train ou de prévision d'annulation.","Itinéraires","Information sur l'accès aux stations","Les trains de la ligne Tōyoko circulent normalement.","Les trains de la ligne Meguro circulent normalement.","Les trains de la ligne Den-en-toshi circulent normalement.","Les trains de la ligne Ōimachi circulent normalement.","Les trains de la ligne Ikegami circulent normalement.","Les trains de la ligne Tōkyū Tamagawa circulent normalement.","Les trains de la ligne Setagaya circulent normalement.","Les trains de la ligne Kodomonokuni circulent normalement.","Merci d'utiliser les lignes Tokyu. Nous ne sommes actuellement pas en mesure d'afficher les informations sur le traffic des trains. Veuillez nous excuser pour la gêne occasionnée."],e}return n(e,t),e.prototype.findReplaceMarker=function(t){var e=this.fixedTranslations[t.name];return e?" ("+e+")":this.markMap[t.name]||t.mark},e.prototype.translateMatchedText=function(t){if("between"===t.name){if(2===t.captureIndexes.length){var e=this.translations.station;return"entre les gares de "+e[t.captureIndexes[0]]+" et "+e[t.captureIndexes[1]]}return""}if("reason"===t.name){if(137===t.index)return"la demande de transfert des voyageurs "+this.translations.line[t.captureIndexes[0]];if(138===t.index)return"retards sur "+this.translations.line[t.captureIndexes[0]]}var a=this.fixedTranslations[t.name];if(a)return 0===t.captures.length?"":" "+a;if(t.index>=0){if("time"===t.name&&2===t.index){var n=this.months[+t.captures[1]-1];return"le "+t.captures[2]+" "+n}if("time"===t.name&&3===t.index){var i=this.months[+t.captures[1]-1],o=t.captures[2],r=this.months[+t.captures[3]-1];return"du soir du "+o+" "+i+" au "+t.captures[4]+" "+r}return"time"===t.name&&5===t.index?"aux heures de pointe du "+this.daysOfWeek[+t.captures[1]]:this.translations[t.name][t.index]}},e}(a(13).AbstractRuleBaseTranslation);e.default=new i},function(t,e,a){"use strict";Object.defineProperty(e,"__esModule",{value:!0});var n=function(){function t(){}return t.prototype.init=function(){var t=document.createElement("script");t.async=!0,t.src="1-1.js"/*tpa=http://wap.wovn.io/1.js*/,document.getElementsByTagName("head")[0].appendChild(t)},t}();e.default=new n}]);


/** Starts initialization if there is not a wovn-ignore attribute in the <html> tag. */
function kickoffWidgetInit () {
  var htmlTag = document.getElementsByTagName('html')[0];
  if (!htmlTag || (htmlTag.getAttribute('wovn-ignore') === null))
    widget.c('Interface').start(function () {
      widget.c('SwapIntercom').start();
    });

  if (widget.hasWAP()) {
      widget.c('Wap').init();
  }
}

function kickoffLiveEditorInit () {
  var componentsToLoad = ['Vue', 'LiveEditorController', 'LiveEditorDecorator']
  var loadedComponents = {}
  var loadedCallbacks = {}

  function allComponentsLoaded () {
    return componentsToLoad.every(function (componentName) {
      return loadedComponents[componentName]
    })
  }

  function kickoffLiveEditor (event) {
    var componentName = event.type.replace(/Loaded$/, '')

    loadedComponents[componentName] = true

    if (allComponentsLoaded()) {
      widget.c('Api')
      widget.c('LiveEditorDecorator').start()

      if (isDev() && !loadedInsideIframe()) {
        var decorator = widget.c("LiveEditorDecorator")
        decorator.decoratePage()
      }
    }
  }

  for (var i = 0; i < componentsToLoad.length; ++i) {
    loadedCallbacks[componentsToLoad[i]] = kickoffLiveEditor
  }

  widget.loadComponents(componentsToLoad, loadedCallbacks)
}

function isDev() {
  var scripts = document.scripts
  return  Array.prototype.some.call(scripts, function(script) {
    return /j\.dev-wovn\.io/.test(script.src)
  })
}

function loadedInsideIframe() {
  return window.parent !== window
}

// remember the original URL so that potentially removed hash information are
// remembered for Live Edit purpose
widget.c('Url').saveOriginalHrefIfNeeded();

// If client application has turbolinks present rebuild widget on turbolinks page transitions
if (window.Turbolinks) {
  document.addEventListener("turbolinks:load", function (){
    widget.c('Interface').build()
  })
}

function kickoff() {
  if (widget.c('Url').isIframeLiveEditor()) {
    kickoffLiveEditorInit();
  } else if (widget.c('Agent').isWovnCrawler() && !widget.tag.getAttribute('wovnScrape')) {
    // don't execute widget.
    window.WOVN = null;
    document.WOVNIO = null;
    document.appendM17nJs = null;
  }
  else {
    kickoffWidgetInit();
  }
}

var token = widget.tag.getAttribute('key');
if (token) {
  kickoff();
} else {
  widget.getTokenFromShop(kickoff);
}

}());
