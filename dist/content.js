"use strict";
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/@mozilla/readability/Readability.js
  var require_Readability = __commonJS({
    "node_modules/@mozilla/readability/Readability.js"(exports, module) {
      function Readability2(doc, options) {
        if (options && options.documentElement) {
          doc = options;
          options = arguments[2];
        } else if (!doc || !doc.documentElement) {
          throw new Error(
            "First argument to Readability constructor should be a document object."
          );
        }
        options = options || {};
        this._doc = doc;
        this._docJSDOMParser = this._doc.firstChild.__JSDOMParser__;
        this._articleTitle = null;
        this._articleByline = null;
        this._articleDir = null;
        this._articleSiteName = null;
        this._attempts = [];
        this._metadata = {};
        this._debug = !!options.debug;
        this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
        this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
        this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
        this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(
          options.classesToPreserve || []
        );
        this._keepClasses = !!options.keepClasses;
        this._serializer = options.serializer || function(el) {
          return el.innerHTML;
        };
        this._disableJSONLD = !!options.disableJSONLD;
        this._allowedVideoRegex = options.allowedVideoRegex || this.REGEXPS.videos;
        this._linkDensityModifier = options.linkDensityModifier || 0;
        this._flags = this.FLAG_STRIP_UNLIKELYS | this.FLAG_WEIGHT_CLASSES | this.FLAG_CLEAN_CONDITIONALLY;
        if (this._debug) {
          let logNode = function(node) {
            if (node.nodeType == node.TEXT_NODE) {
              return `${node.nodeName} ("${node.textContent}")`;
            }
            let attrPairs = Array.from(node.attributes || [], function(attr) {
              return `${attr.name}="${attr.value}"`;
            }).join(" ");
            return `<${node.localName} ${attrPairs}>`;
          };
          this.log = function() {
            if (typeof console !== "undefined") {
              let args = Array.from(arguments, (arg) => {
                if (arg && arg.nodeType == this.ELEMENT_NODE) {
                  return logNode(arg);
                }
                return arg;
              });
              args.unshift("Reader: (Readability)");
              console.log(...args);
            } else if (typeof dump !== "undefined") {
              var msg = Array.prototype.map.call(arguments, function(x) {
                return x && x.nodeName ? logNode(x) : x;
              }).join(" ");
              dump("Reader: (Readability) " + msg + "\n");
            }
          };
        } else {
          this.log = function() {
          };
        }
      }
      Readability2.prototype = {
        FLAG_STRIP_UNLIKELYS: 1,
        FLAG_WEIGHT_CLASSES: 2,
        FLAG_CLEAN_CONDITIONALLY: 4,
        // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
        ELEMENT_NODE: 1,
        TEXT_NODE: 3,
        // Max number of nodes supported by this parser. Default: 0 (no limit)
        DEFAULT_MAX_ELEMS_TO_PARSE: 0,
        // The number of top candidates to consider when analysing how
        // tight the competition is among candidates.
        DEFAULT_N_TOP_CANDIDATES: 5,
        // Element tags to score by default.
        DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),
        // The default number of chars an article must have in order to return a result
        DEFAULT_CHAR_THRESHOLD: 500,
        // All of the regular expressions in use within readability.
        // Defined up here so we don't instantiate them repeatedly in loops.
        REGEXPS: {
          // NOTE: These two regular expressions are duplicated in
          // Readability-readerable.js. Please keep both copies in sync.
          unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
          okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,
          positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
          negative: /-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|footer|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|widget/i,
          extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
          byline: /byline|author|dateline|writtenby|p-author/i,
          replaceFonts: /<(\/?)font[^>]*>/gi,
          normalize: /\s{2,}/g,
          videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
          shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
          nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
          prevLink: /(prev|earl|old|new|<|«)/i,
          tokenize: /\W+/g,
          whitespace: /^\s*$/,
          hasContent: /\S$/,
          hashUrl: /^#.+/,
          srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
          b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
          // Commas as used in Latin, Sindhi, Chinese and various other scripts.
          // see: https://en.wikipedia.org/wiki/Comma#Comma_variants
          commas: /\u002C|\u060C|\uFE50|\uFE10|\uFE11|\u2E41|\u2E34|\u2E32|\uFF0C/g,
          // See: https://schema.org/Article
          jsonLdArticleTypes: /^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/,
          // used to see if a node's content matches words commonly used for ad blocks or loading indicators
          adWords: /^(ad(vertising|vertisement)?|pub(licité)?|werb(ung)?|广告|Реклама|Anuncio)$/iu,
          loadingWords: /^((loading|正在加载|Загрузка|chargement|cargando)(…|\.\.\.)?)$/iu
        },
        UNLIKELY_ROLES: [
          "menu",
          "menubar",
          "complementary",
          "navigation",
          "alert",
          "alertdialog",
          "dialog"
        ],
        DIV_TO_P_ELEMS: /* @__PURE__ */ new Set([
          "BLOCKQUOTE",
          "DL",
          "DIV",
          "IMG",
          "OL",
          "P",
          "PRE",
          "TABLE",
          "UL"
        ]),
        ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P", "OL", "UL"],
        PRESENTATIONAL_ATTRIBUTES: [
          "align",
          "background",
          "bgcolor",
          "border",
          "cellpadding",
          "cellspacing",
          "frame",
          "hspace",
          "rules",
          "style",
          "valign",
          "vspace"
        ],
        DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ["TABLE", "TH", "TD", "HR", "PRE"],
        // The commented out elements qualify as phrasing content but tend to be
        // removed by readability when put into paragraphs, so we ignore them here.
        PHRASING_ELEMS: [
          // "CANVAS", "IFRAME", "SVG", "VIDEO",
          "ABBR",
          "AUDIO",
          "B",
          "BDO",
          "BR",
          "BUTTON",
          "CITE",
          "CODE",
          "DATA",
          "DATALIST",
          "DFN",
          "EM",
          "EMBED",
          "I",
          "IMG",
          "INPUT",
          "KBD",
          "LABEL",
          "MARK",
          "MATH",
          "METER",
          "NOSCRIPT",
          "OBJECT",
          "OUTPUT",
          "PROGRESS",
          "Q",
          "RUBY",
          "SAMP",
          "SCRIPT",
          "SELECT",
          "SMALL",
          "SPAN",
          "STRONG",
          "SUB",
          "SUP",
          "TEXTAREA",
          "TIME",
          "VAR",
          "WBR"
        ],
        // These are the classes that readability sets itself.
        CLASSES_TO_PRESERVE: ["page"],
        // These are the list of HTML entities that need to be escaped.
        HTML_ESCAPE_MAP: {
          lt: "<",
          gt: ">",
          amp: "&",
          quot: '"',
          apos: "'"
        },
        /**
         * Run any post-process modifications to article content as necessary.
         *
         * @param Element
         * @return void
         **/
        _postProcessContent(articleContent) {
          this._fixRelativeUris(articleContent);
          this._simplifyNestedElements(articleContent);
          if (!this._keepClasses) {
            this._cleanClasses(articleContent);
          }
        },
        /**
         * Iterates over a NodeList, calls `filterFn` for each node and removes node
         * if function returned `true`.
         *
         * If function is not passed, removes all the nodes in node list.
         *
         * @param NodeList nodeList The nodes to operate on
         * @param Function filterFn the function to use as a filter
         * @return void
         */
        _removeNodes(nodeList, filterFn) {
          if (this._docJSDOMParser && nodeList._isLiveNodeList) {
            throw new Error("Do not pass live node lists to _removeNodes");
          }
          for (var i = nodeList.length - 1; i >= 0; i--) {
            var node = nodeList[i];
            var parentNode = node.parentNode;
            if (parentNode) {
              if (!filterFn || filterFn.call(this, node, i, nodeList)) {
                parentNode.removeChild(node);
              }
            }
          }
        },
        /**
         * Iterates over a NodeList, and calls _setNodeTag for each node.
         *
         * @param NodeList nodeList The nodes to operate on
         * @param String newTagName the new tag name to use
         * @return void
         */
        _replaceNodeTags(nodeList, newTagName) {
          if (this._docJSDOMParser && nodeList._isLiveNodeList) {
            throw new Error("Do not pass live node lists to _replaceNodeTags");
          }
          for (const node of nodeList) {
            this._setNodeTag(node, newTagName);
          }
        },
        /**
         * Iterate over a NodeList, which doesn't natively fully implement the Array
         * interface.
         *
         * For convenience, the current object context is applied to the provided
         * iterate function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The iterate function.
         * @return void
         */
        _forEachNode(nodeList, fn) {
          Array.prototype.forEach.call(nodeList, fn, this);
        },
        /**
         * Iterate over a NodeList, and return the first node that passes
         * the supplied test function
         *
         * For convenience, the current object context is applied to the provided
         * test function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The test function.
         * @return void
         */
        _findNode(nodeList, fn) {
          return Array.prototype.find.call(nodeList, fn, this);
        },
        /**
         * Iterate over a NodeList, return true if any of the provided iterate
         * function calls returns true, false otherwise.
         *
         * For convenience, the current object context is applied to the
         * provided iterate function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The iterate function.
         * @return Boolean
         */
        _someNode(nodeList, fn) {
          return Array.prototype.some.call(nodeList, fn, this);
        },
        /**
         * Iterate over a NodeList, return true if all of the provided iterate
         * function calls return true, false otherwise.
         *
         * For convenience, the current object context is applied to the
         * provided iterate function.
         *
         * @param  NodeList nodeList The NodeList.
         * @param  Function fn       The iterate function.
         * @return Boolean
         */
        _everyNode(nodeList, fn) {
          return Array.prototype.every.call(nodeList, fn, this);
        },
        _getAllNodesWithTag(node, tagNames) {
          if (node.querySelectorAll) {
            return node.querySelectorAll(tagNames.join(","));
          }
          return [].concat.apply(
            [],
            tagNames.map(function(tag) {
              var collection = node.getElementsByTagName(tag);
              return Array.isArray(collection) ? collection : Array.from(collection);
            })
          );
        },
        /**
         * Removes the class="" attribute from every element in the given
         * subtree, except those that match CLASSES_TO_PRESERVE and
         * the classesToPreserve array from the options object.
         *
         * @param Element
         * @return void
         */
        _cleanClasses(node) {
          var classesToPreserve = this._classesToPreserve;
          var className = (node.getAttribute("class") || "").split(/\s+/).filter((cls) => classesToPreserve.includes(cls)).join(" ");
          if (className) {
            node.setAttribute("class", className);
          } else {
            node.removeAttribute("class");
          }
          for (node = node.firstElementChild; node; node = node.nextElementSibling) {
            this._cleanClasses(node);
          }
        },
        /**
         * Tests whether a string is a URL or not.
         *
         * @param {string} str The string to test
         * @return {boolean} true if str is a URL, false if not
         */
        _isUrl(str) {
          try {
            new URL(str);
            return true;
          } catch {
            return false;
          }
        },
        /**
         * Converts each <a> and <img> uri in the given element to an absolute URI,
         * ignoring #ref URIs.
         *
         * @param Element
         * @return void
         */
        _fixRelativeUris(articleContent) {
          var baseURI = this._doc.baseURI;
          var documentURI = this._doc.documentURI;
          function toAbsoluteURI(uri) {
            if (baseURI == documentURI && uri.charAt(0) == "#") {
              return uri;
            }
            try {
              return new URL(uri, baseURI).href;
            } catch (ex) {
            }
            return uri;
          }
          var links = this._getAllNodesWithTag(articleContent, ["a"]);
          this._forEachNode(links, function(link) {
            var href = link.getAttribute("href");
            if (href) {
              if (href.indexOf("javascript:") === 0) {
                if (link.childNodes.length === 1 && link.childNodes[0].nodeType === this.TEXT_NODE) {
                  var text = this._doc.createTextNode(link.textContent);
                  link.parentNode.replaceChild(text, link);
                } else {
                  var container = this._doc.createElement("span");
                  while (link.firstChild) {
                    container.appendChild(link.firstChild);
                  }
                  link.parentNode.replaceChild(container, link);
                }
              } else {
                link.setAttribute("href", toAbsoluteURI(href));
              }
            }
          });
          var medias = this._getAllNodesWithTag(articleContent, [
            "img",
            "picture",
            "figure",
            "video",
            "audio",
            "source"
          ]);
          this._forEachNode(medias, function(media) {
            var src = media.getAttribute("src");
            var poster = media.getAttribute("poster");
            var srcset = media.getAttribute("srcset");
            if (src) {
              media.setAttribute("src", toAbsoluteURI(src));
            }
            if (poster) {
              media.setAttribute("poster", toAbsoluteURI(poster));
            }
            if (srcset) {
              var newSrcset = srcset.replace(
                this.REGEXPS.srcsetUrl,
                function(_, p1, p2, p3) {
                  return toAbsoluteURI(p1) + (p2 || "") + p3;
                }
              );
              media.setAttribute("srcset", newSrcset);
            }
          });
        },
        _simplifyNestedElements(articleContent) {
          var node = articleContent;
          while (node) {
            if (node.parentNode && ["DIV", "SECTION"].includes(node.tagName) && !(node.id && node.id.startsWith("readability"))) {
              if (this._isElementWithoutContent(node)) {
                node = this._removeAndGetNext(node);
                continue;
              } else if (this._hasSingleTagInsideElement(node, "DIV") || this._hasSingleTagInsideElement(node, "SECTION")) {
                var child = node.children[0];
                for (var i = 0; i < node.attributes.length; i++) {
                  child.setAttributeNode(node.attributes[i].cloneNode());
                }
                node.parentNode.replaceChild(child, node);
                node = child;
                continue;
              }
            }
            node = this._getNextNode(node);
          }
        },
        /**
         * Get the article title as an H1.
         *
         * @return string
         **/
        _getArticleTitle() {
          var doc = this._doc;
          var curTitle = "";
          var origTitle = "";
          try {
            curTitle = origTitle = doc.title.trim();
            if (typeof curTitle !== "string") {
              curTitle = origTitle = this._getInnerText(
                doc.getElementsByTagName("title")[0]
              );
            }
          } catch (e) {
          }
          var titleHadHierarchicalSeparators = false;
          function wordCount(str) {
            return str.split(/\s+/).length;
          }
          if (/ [\|\-\\\/>»] /.test(curTitle)) {
            titleHadHierarchicalSeparators = / [\\\/>»] /.test(curTitle);
            let allSeparators = Array.from(origTitle.matchAll(/ [\|\-\\\/>»] /gi));
            curTitle = origTitle.substring(0, allSeparators.pop().index);
            if (wordCount(curTitle) < 3) {
              curTitle = origTitle.replace(/^[^\|\-\\\/>»]*[\|\-\\\/>»]/gi, "");
            }
          } else if (curTitle.includes(": ")) {
            var headings = this._getAllNodesWithTag(doc, ["h1", "h2"]);
            var trimmedTitle = curTitle.trim();
            var match = this._someNode(headings, function(heading) {
              return heading.textContent.trim() === trimmedTitle;
            });
            if (!match) {
              curTitle = origTitle.substring(origTitle.lastIndexOf(":") + 1);
              if (wordCount(curTitle) < 3) {
                curTitle = origTitle.substring(origTitle.indexOf(":") + 1);
              } else if (wordCount(origTitle.substr(0, origTitle.indexOf(":"))) > 5) {
                curTitle = origTitle;
              }
            }
          } else if (curTitle.length > 150 || curTitle.length < 15) {
            var hOnes = doc.getElementsByTagName("h1");
            if (hOnes.length === 1) {
              curTitle = this._getInnerText(hOnes[0]);
            }
          }
          curTitle = curTitle.trim().replace(this.REGEXPS.normalize, " ");
          var curTitleWordCount = wordCount(curTitle);
          if (curTitleWordCount <= 4 && (!titleHadHierarchicalSeparators || curTitleWordCount != wordCount(origTitle.replace(/[\|\-\\\/>»]+/g, "")) - 1)) {
            curTitle = origTitle;
          }
          return curTitle;
        },
        /**
         * Prepare the HTML document for readability to scrape it.
         * This includes things like stripping javascript, CSS, and handling terrible markup.
         *
         * @return void
         **/
        _prepDocument() {
          var doc = this._doc;
          this._removeNodes(this._getAllNodesWithTag(doc, ["style"]));
          if (doc.body) {
            this._replaceBrs(doc.body);
          }
          this._replaceNodeTags(this._getAllNodesWithTag(doc, ["font"]), "SPAN");
        },
        /**
         * Finds the next node, starting from the given node, and ignoring
         * whitespace in between. If the given node is an element, the same node is
         * returned.
         */
        _nextNode(node) {
          var next = node;
          while (next && next.nodeType != this.ELEMENT_NODE && this.REGEXPS.whitespace.test(next.textContent)) {
            next = next.nextSibling;
          }
          return next;
        },
        /**
         * Replaces 2 or more successive <br> elements with a single <p>.
         * Whitespace between <br> elements are ignored. For example:
         *   <div>foo<br>bar<br> <br><br>abc</div>
         * will become:
         *   <div>foo<br>bar<p>abc</p></div>
         */
        _replaceBrs(elem) {
          this._forEachNode(this._getAllNodesWithTag(elem, ["br"]), function(br) {
            var next = br.nextSibling;
            var replaced = false;
            while ((next = this._nextNode(next)) && next.tagName == "BR") {
              replaced = true;
              var brSibling = next.nextSibling;
              next.remove();
              next = brSibling;
            }
            if (replaced) {
              var p = this._doc.createElement("p");
              br.parentNode.replaceChild(p, br);
              next = p.nextSibling;
              while (next) {
                if (next.tagName == "BR") {
                  var nextElem = this._nextNode(next.nextSibling);
                  if (nextElem && nextElem.tagName == "BR") {
                    break;
                  }
                }
                if (!this._isPhrasingContent(next)) {
                  break;
                }
                var sibling = next.nextSibling;
                p.appendChild(next);
                next = sibling;
              }
              while (p.lastChild && this._isWhitespace(p.lastChild)) {
                p.lastChild.remove();
              }
              if (p.parentNode.tagName === "P") {
                this._setNodeTag(p.parentNode, "DIV");
              }
            }
          });
        },
        _setNodeTag(node, tag) {
          this.log("_setNodeTag", node, tag);
          if (this._docJSDOMParser) {
            node.localName = tag.toLowerCase();
            node.tagName = tag.toUpperCase();
            return node;
          }
          var replacement = node.ownerDocument.createElement(tag);
          while (node.firstChild) {
            replacement.appendChild(node.firstChild);
          }
          node.parentNode.replaceChild(replacement, node);
          if (node.readability) {
            replacement.readability = node.readability;
          }
          for (var i = 0; i < node.attributes.length; i++) {
            replacement.setAttributeNode(node.attributes[i].cloneNode());
          }
          return replacement;
        },
        /**
         * Prepare the article node for display. Clean out any inline styles,
         * iframes, forms, strip extraneous <p> tags, etc.
         *
         * @param Element
         * @return void
         **/
        _prepArticle(articleContent) {
          this._cleanStyles(articleContent);
          this._markDataTables(articleContent);
          this._fixLazyImages(articleContent);
          this._cleanConditionally(articleContent, "form");
          this._cleanConditionally(articleContent, "fieldset");
          this._clean(articleContent, "object");
          this._clean(articleContent, "embed");
          this._clean(articleContent, "footer");
          this._clean(articleContent, "link");
          this._clean(articleContent, "aside");
          var shareElementThreshold = this.DEFAULT_CHAR_THRESHOLD;
          this._forEachNode(articleContent.children, function(topCandidate) {
            this._cleanMatchedNodes(topCandidate, function(node, matchString) {
              return this.REGEXPS.shareElements.test(matchString) && node.textContent.length < shareElementThreshold;
            });
          });
          this._clean(articleContent, "iframe");
          this._clean(articleContent, "input");
          this._clean(articleContent, "textarea");
          this._clean(articleContent, "select");
          this._clean(articleContent, "button");
          this._cleanHeaders(articleContent);
          this._cleanConditionally(articleContent, "table");
          this._cleanConditionally(articleContent, "ul");
          this._cleanConditionally(articleContent, "div");
          this._replaceNodeTags(
            this._getAllNodesWithTag(articleContent, ["h1"]),
            "h2"
          );
          this._removeNodes(
            this._getAllNodesWithTag(articleContent, ["p"]),
            function(paragraph) {
              var contentElementCount = this._getAllNodesWithTag(paragraph, [
                "img",
                "embed",
                "object",
                "iframe"
              ]).length;
              return contentElementCount === 0 && !this._getInnerText(paragraph, false);
            }
          );
          this._forEachNode(
            this._getAllNodesWithTag(articleContent, ["br"]),
            function(br) {
              var next = this._nextNode(br.nextSibling);
              if (next && next.tagName == "P") {
                br.remove();
              }
            }
          );
          this._forEachNode(
            this._getAllNodesWithTag(articleContent, ["table"]),
            function(table) {
              var tbody = this._hasSingleTagInsideElement(table, "TBODY") ? table.firstElementChild : table;
              if (this._hasSingleTagInsideElement(tbody, "TR")) {
                var row = tbody.firstElementChild;
                if (this._hasSingleTagInsideElement(row, "TD")) {
                  var cell = row.firstElementChild;
                  cell = this._setNodeTag(
                    cell,
                    this._everyNode(cell.childNodes, this._isPhrasingContent) ? "P" : "DIV"
                  );
                  table.parentNode.replaceChild(cell, table);
                }
              }
            }
          );
        },
        /**
         * Initialize a node with the readability object. Also checks the
         * className/id for special names to add to its score.
         *
         * @param Element
         * @return void
         **/
        _initializeNode(node) {
          node.readability = { contentScore: 0 };
          switch (node.tagName) {
            case "DIV":
              node.readability.contentScore += 5;
              break;
            case "PRE":
            case "TD":
            case "BLOCKQUOTE":
              node.readability.contentScore += 3;
              break;
            case "ADDRESS":
            case "OL":
            case "UL":
            case "DL":
            case "DD":
            case "DT":
            case "LI":
            case "FORM":
              node.readability.contentScore -= 3;
              break;
            case "H1":
            case "H2":
            case "H3":
            case "H4":
            case "H5":
            case "H6":
            case "TH":
              node.readability.contentScore -= 5;
              break;
          }
          node.readability.contentScore += this._getClassWeight(node);
        },
        _removeAndGetNext(node) {
          var nextNode = this._getNextNode(node, true);
          node.remove();
          return nextNode;
        },
        /**
         * Traverse the DOM from node to node, starting at the node passed in.
         * Pass true for the second parameter to indicate this node itself
         * (and its kids) are going away, and we want the next node over.
         *
         * Calling this in a loop will traverse the DOM depth-first.
         *
         * @param {Element} node
         * @param {boolean} ignoreSelfAndKids
         * @return {Element}
         */
        _getNextNode(node, ignoreSelfAndKids) {
          if (!ignoreSelfAndKids && node.firstElementChild) {
            return node.firstElementChild;
          }
          if (node.nextElementSibling) {
            return node.nextElementSibling;
          }
          do {
            node = node.parentNode;
          } while (node && !node.nextElementSibling);
          return node && node.nextElementSibling;
        },
        // compares second text to first one
        // 1 = same text, 0 = completely different text
        // works the way that it splits both texts into words and then finds words that are unique in second text
        // the result is given by the lower length of unique parts
        _textSimilarity(textA, textB) {
          var tokensA = textA.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
          var tokensB = textB.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
          if (!tokensA.length || !tokensB.length) {
            return 0;
          }
          var uniqTokensB = tokensB.filter((token) => !tokensA.includes(token));
          var distanceB = uniqTokensB.join(" ").length / tokensB.join(" ").length;
          return 1 - distanceB;
        },
        /**
         * Checks whether an element node contains a valid byline
         *
         * @param node {Element}
         * @param matchString {string}
         * @return boolean
         */
        _isValidByline(node, matchString) {
          var rel = node.getAttribute("rel");
          var itemprop = node.getAttribute("itemprop");
          var bylineLength = node.textContent.trim().length;
          return (rel === "author" || itemprop && itemprop.includes("author") || this.REGEXPS.byline.test(matchString)) && !!bylineLength && bylineLength < 100;
        },
        _getNodeAncestors(node, maxDepth) {
          maxDepth = maxDepth || 0;
          var i = 0, ancestors = [];
          while (node.parentNode) {
            ancestors.push(node.parentNode);
            if (maxDepth && ++i === maxDepth) {
              break;
            }
            node = node.parentNode;
          }
          return ancestors;
        },
        /***
         * grabArticle - Using a variety of metrics (content score, classname, element types), find the content that is
         *         most likely to be the stuff a user wants to read. Then return it wrapped up in a div.
         *
         * @param page a document to run upon. Needs to be a full document, complete with body.
         * @return Element
         **/
        /* eslint-disable-next-line complexity */
        _grabArticle(page) {
          this.log("**** grabArticle ****");
          var doc = this._doc;
          var isPaging = page !== null;
          page = page ? page : this._doc.body;
          if (!page) {
            this.log("No body found in document. Abort.");
            return null;
          }
          var pageCacheHtml = page.innerHTML;
          while (true) {
            this.log("Starting grabArticle loop");
            var stripUnlikelyCandidates = this._flagIsActive(
              this.FLAG_STRIP_UNLIKELYS
            );
            var elementsToScore = [];
            var node = this._doc.documentElement;
            let shouldRemoveTitleHeader = true;
            while (node) {
              if (node.tagName === "HTML") {
                this._articleLang = node.getAttribute("lang");
              }
              var matchString = node.className + " " + node.id;
              if (!this._isProbablyVisible(node)) {
                this.log("Removing hidden node - " + matchString);
                node = this._removeAndGetNext(node);
                continue;
              }
              if (node.getAttribute("aria-modal") == "true" && node.getAttribute("role") == "dialog") {
                node = this._removeAndGetNext(node);
                continue;
              }
              if (!this._articleByline && !this._metadata.byline && this._isValidByline(node, matchString)) {
                var endOfSearchMarkerNode = this._getNextNode(node, true);
                var next = this._getNextNode(node);
                var itemPropNameNode = null;
                while (next && next != endOfSearchMarkerNode) {
                  var itemprop = next.getAttribute("itemprop");
                  if (itemprop && itemprop.includes("name")) {
                    itemPropNameNode = next;
                    break;
                  } else {
                    next = this._getNextNode(next);
                  }
                }
                this._articleByline = (itemPropNameNode ?? node).textContent.trim();
                node = this._removeAndGetNext(node);
                continue;
              }
              if (shouldRemoveTitleHeader && this._headerDuplicatesTitle(node)) {
                this.log(
                  "Removing header: ",
                  node.textContent.trim(),
                  this._articleTitle.trim()
                );
                shouldRemoveTitleHeader = false;
                node = this._removeAndGetNext(node);
                continue;
              }
              if (stripUnlikelyCandidates) {
                if (this.REGEXPS.unlikelyCandidates.test(matchString) && !this.REGEXPS.okMaybeItsACandidate.test(matchString) && !this._hasAncestorTag(node, "table") && !this._hasAncestorTag(node, "code") && node.tagName !== "BODY" && node.tagName !== "A") {
                  this.log("Removing unlikely candidate - " + matchString);
                  node = this._removeAndGetNext(node);
                  continue;
                }
                if (this.UNLIKELY_ROLES.includes(node.getAttribute("role"))) {
                  this.log(
                    "Removing content with role " + node.getAttribute("role") + " - " + matchString
                  );
                  node = this._removeAndGetNext(node);
                  continue;
                }
              }
              if ((node.tagName === "DIV" || node.tagName === "SECTION" || node.tagName === "HEADER" || node.tagName === "H1" || node.tagName === "H2" || node.tagName === "H3" || node.tagName === "H4" || node.tagName === "H5" || node.tagName === "H6") && this._isElementWithoutContent(node)) {
                node = this._removeAndGetNext(node);
                continue;
              }
              if (this.DEFAULT_TAGS_TO_SCORE.includes(node.tagName)) {
                elementsToScore.push(node);
              }
              if (node.tagName === "DIV") {
                var p = null;
                var childNode = node.firstChild;
                while (childNode) {
                  var nextSibling = childNode.nextSibling;
                  if (this._isPhrasingContent(childNode)) {
                    if (p !== null) {
                      p.appendChild(childNode);
                    } else if (!this._isWhitespace(childNode)) {
                      p = doc.createElement("p");
                      node.replaceChild(p, childNode);
                      p.appendChild(childNode);
                    }
                  } else if (p !== null) {
                    while (p.lastChild && this._isWhitespace(p.lastChild)) {
                      p.lastChild.remove();
                    }
                    p = null;
                  }
                  childNode = nextSibling;
                }
                if (this._hasSingleTagInsideElement(node, "P") && this._getLinkDensity(node) < 0.25) {
                  var newNode = node.children[0];
                  node.parentNode.replaceChild(newNode, node);
                  node = newNode;
                  elementsToScore.push(node);
                } else if (!this._hasChildBlockElement(node)) {
                  node = this._setNodeTag(node, "P");
                  elementsToScore.push(node);
                }
              }
              node = this._getNextNode(node);
            }
            var candidates = [];
            this._forEachNode(elementsToScore, function(elementToScore) {
              if (!elementToScore.parentNode || typeof elementToScore.parentNode.tagName === "undefined") {
                return;
              }
              var innerText = this._getInnerText(elementToScore);
              if (innerText.length < 25) {
                return;
              }
              var ancestors2 = this._getNodeAncestors(elementToScore, 5);
              if (ancestors2.length === 0) {
                return;
              }
              var contentScore = 0;
              contentScore += 1;
              contentScore += innerText.split(this.REGEXPS.commas).length;
              contentScore += Math.min(Math.floor(innerText.length / 100), 3);
              this._forEachNode(ancestors2, function(ancestor, level) {
                if (!ancestor.tagName || !ancestor.parentNode || typeof ancestor.parentNode.tagName === "undefined") {
                  return;
                }
                if (typeof ancestor.readability === "undefined") {
                  this._initializeNode(ancestor);
                  candidates.push(ancestor);
                }
                if (level === 0) {
                  var scoreDivider = 1;
                } else if (level === 1) {
                  scoreDivider = 2;
                } else {
                  scoreDivider = level * 3;
                }
                ancestor.readability.contentScore += contentScore / scoreDivider;
              });
            });
            var topCandidates = [];
            for (var c = 0, cl = candidates.length; c < cl; c += 1) {
              var candidate = candidates[c];
              var candidateScore = candidate.readability.contentScore * (1 - this._getLinkDensity(candidate));
              candidate.readability.contentScore = candidateScore;
              this.log("Candidate:", candidate, "with score " + candidateScore);
              for (var t = 0; t < this._nbTopCandidates; t++) {
                var aTopCandidate = topCandidates[t];
                if (!aTopCandidate || candidateScore > aTopCandidate.readability.contentScore) {
                  topCandidates.splice(t, 0, candidate);
                  if (topCandidates.length > this._nbTopCandidates) {
                    topCandidates.pop();
                  }
                  break;
                }
              }
            }
            var topCandidate = topCandidates[0] || null;
            var neededToCreateTopCandidate = false;
            var parentOfTopCandidate;
            if (topCandidate === null || topCandidate.tagName === "BODY") {
              topCandidate = doc.createElement("DIV");
              neededToCreateTopCandidate = true;
              while (page.firstChild) {
                this.log("Moving child out:", page.firstChild);
                topCandidate.appendChild(page.firstChild);
              }
              page.appendChild(topCandidate);
              this._initializeNode(topCandidate);
            } else if (topCandidate) {
              var alternativeCandidateAncestors = [];
              for (var i = 1; i < topCandidates.length; i++) {
                if (topCandidates[i].readability.contentScore / topCandidate.readability.contentScore >= 0.75) {
                  alternativeCandidateAncestors.push(
                    this._getNodeAncestors(topCandidates[i])
                  );
                }
              }
              var MINIMUM_TOPCANDIDATES = 3;
              if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
                parentOfTopCandidate = topCandidate.parentNode;
                while (parentOfTopCandidate.tagName !== "BODY") {
                  var listsContainingThisAncestor = 0;
                  for (var ancestorIndex = 0; ancestorIndex < alternativeCandidateAncestors.length && listsContainingThisAncestor < MINIMUM_TOPCANDIDATES; ancestorIndex++) {
                    listsContainingThisAncestor += Number(
                      alternativeCandidateAncestors[ancestorIndex].includes(
                        parentOfTopCandidate
                      )
                    );
                  }
                  if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
                    topCandidate = parentOfTopCandidate;
                    break;
                  }
                  parentOfTopCandidate = parentOfTopCandidate.parentNode;
                }
              }
              if (!topCandidate.readability) {
                this._initializeNode(topCandidate);
              }
              parentOfTopCandidate = topCandidate.parentNode;
              var lastScore = topCandidate.readability.contentScore;
              var scoreThreshold = lastScore / 3;
              while (parentOfTopCandidate.tagName !== "BODY") {
                if (!parentOfTopCandidate.readability) {
                  parentOfTopCandidate = parentOfTopCandidate.parentNode;
                  continue;
                }
                var parentScore = parentOfTopCandidate.readability.contentScore;
                if (parentScore < scoreThreshold) {
                  break;
                }
                if (parentScore > lastScore) {
                  topCandidate = parentOfTopCandidate;
                  break;
                }
                lastScore = parentOfTopCandidate.readability.contentScore;
                parentOfTopCandidate = parentOfTopCandidate.parentNode;
              }
              parentOfTopCandidate = topCandidate.parentNode;
              while (parentOfTopCandidate.tagName != "BODY" && parentOfTopCandidate.children.length == 1) {
                topCandidate = parentOfTopCandidate;
                parentOfTopCandidate = topCandidate.parentNode;
              }
              if (!topCandidate.readability) {
                this._initializeNode(topCandidate);
              }
            }
            var articleContent = doc.createElement("DIV");
            if (isPaging) {
              articleContent.id = "readability-content";
            }
            var siblingScoreThreshold = Math.max(
              10,
              topCandidate.readability.contentScore * 0.2
            );
            parentOfTopCandidate = topCandidate.parentNode;
            var siblings = parentOfTopCandidate.children;
            for (var s = 0, sl = siblings.length; s < sl; s++) {
              var sibling = siblings[s];
              var append = false;
              this.log(
                "Looking at sibling node:",
                sibling,
                sibling.readability ? "with score " + sibling.readability.contentScore : ""
              );
              this.log(
                "Sibling has score",
                sibling.readability ? sibling.readability.contentScore : "Unknown"
              );
              if (sibling === topCandidate) {
                append = true;
              } else {
                var contentBonus = 0;
                if (sibling.className === topCandidate.className && topCandidate.className !== "") {
                  contentBonus += topCandidate.readability.contentScore * 0.2;
                }
                if (sibling.readability && sibling.readability.contentScore + contentBonus >= siblingScoreThreshold) {
                  append = true;
                } else if (sibling.nodeName === "P") {
                  var linkDensity = this._getLinkDensity(sibling);
                  var nodeContent = this._getInnerText(sibling);
                  var nodeLength = nodeContent.length;
                  if (nodeLength > 80 && linkDensity < 0.25) {
                    append = true;
                  } else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1) {
                    append = true;
                  }
                }
              }
              if (append) {
                this.log("Appending node:", sibling);
                if (!this.ALTER_TO_DIV_EXCEPTIONS.includes(sibling.nodeName)) {
                  this.log("Altering sibling:", sibling, "to div.");
                  sibling = this._setNodeTag(sibling, "DIV");
                }
                articleContent.appendChild(sibling);
                siblings = parentOfTopCandidate.children;
                s -= 1;
                sl -= 1;
              }
            }
            if (this._debug) {
              this.log("Article content pre-prep: " + articleContent.innerHTML);
            }
            this._prepArticle(articleContent);
            if (this._debug) {
              this.log("Article content post-prep: " + articleContent.innerHTML);
            }
            if (neededToCreateTopCandidate) {
              topCandidate.id = "readability-page-1";
              topCandidate.className = "page";
            } else {
              var div = doc.createElement("DIV");
              div.id = "readability-page-1";
              div.className = "page";
              while (articleContent.firstChild) {
                div.appendChild(articleContent.firstChild);
              }
              articleContent.appendChild(div);
            }
            if (this._debug) {
              this.log("Article content after paging: " + articleContent.innerHTML);
            }
            var parseSuccessful = true;
            var textLength = this._getInnerText(articleContent, true).length;
            if (textLength < this._charThreshold) {
              parseSuccessful = false;
              page.innerHTML = pageCacheHtml;
              this._attempts.push({
                articleContent,
                textLength
              });
              if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
                this._removeFlag(this.FLAG_STRIP_UNLIKELYS);
              } else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
                this._removeFlag(this.FLAG_WEIGHT_CLASSES);
              } else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
                this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY);
              } else {
                this._attempts.sort(function(a, b) {
                  return b.textLength - a.textLength;
                });
                if (!this._attempts[0].textLength) {
                  return null;
                }
                articleContent = this._attempts[0].articleContent;
                parseSuccessful = true;
              }
            }
            if (parseSuccessful) {
              var ancestors = [parentOfTopCandidate, topCandidate].concat(
                this._getNodeAncestors(parentOfTopCandidate)
              );
              this._someNode(ancestors, function(ancestor) {
                if (!ancestor.tagName) {
                  return false;
                }
                var articleDir = ancestor.getAttribute("dir");
                if (articleDir) {
                  this._articleDir = articleDir;
                  return true;
                }
                return false;
              });
              return articleContent;
            }
          }
        },
        /**
         * Converts some of the common HTML entities in string to their corresponding characters.
         *
         * @param str {string} - a string to unescape.
         * @return string without HTML entity.
         */
        _unescapeHtmlEntities(str) {
          if (!str) {
            return str;
          }
          var htmlEscapeMap = this.HTML_ESCAPE_MAP;
          return str.replace(/&(quot|amp|apos|lt|gt);/g, function(_, tag) {
            return htmlEscapeMap[tag];
          }).replace(/&#(?:x([0-9a-f]+)|([0-9]+));/gi, function(_, hex, numStr) {
            var num = parseInt(hex || numStr, hex ? 16 : 10);
            if (num == 0 || num > 1114111 || num >= 55296 && num <= 57343) {
              num = 65533;
            }
            return String.fromCodePoint(num);
          });
        },
        /**
         * Try to extract metadata from JSON-LD object.
         * For now, only Schema.org objects of type Article or its subtypes are supported.
         * @return Object with any metadata that could be extracted (possibly none)
         */
        _getJSONLD(doc) {
          var scripts = this._getAllNodesWithTag(doc, ["script"]);
          var metadata;
          this._forEachNode(scripts, function(jsonLdElement) {
            if (!metadata && jsonLdElement.getAttribute("type") === "application/ld+json") {
              try {
                var content = jsonLdElement.textContent.replace(
                  /^\s*<!\[CDATA\[|\]\]>\s*$/g,
                  ""
                );
                var parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                  parsed = parsed.find((it) => {
                    return it["@type"] && it["@type"].match(this.REGEXPS.jsonLdArticleTypes);
                  });
                  if (!parsed) {
                    return;
                  }
                }
                var schemaDotOrgRegex = /^https?\:\/\/schema\.org\/?$/;
                var matches = typeof parsed["@context"] === "string" && parsed["@context"].match(schemaDotOrgRegex) || typeof parsed["@context"] === "object" && typeof parsed["@context"]["@vocab"] == "string" && parsed["@context"]["@vocab"].match(schemaDotOrgRegex);
                if (!matches) {
                  return;
                }
                if (!parsed["@type"] && Array.isArray(parsed["@graph"])) {
                  parsed = parsed["@graph"].find((it) => {
                    return (it["@type"] || "").match(this.REGEXPS.jsonLdArticleTypes);
                  });
                }
                if (!parsed || !parsed["@type"] || !parsed["@type"].match(this.REGEXPS.jsonLdArticleTypes)) {
                  return;
                }
                metadata = {};
                if (typeof parsed.name === "string" && typeof parsed.headline === "string" && parsed.name !== parsed.headline) {
                  var title = this._getArticleTitle();
                  var nameMatches = this._textSimilarity(parsed.name, title) > 0.75;
                  var headlineMatches = this._textSimilarity(parsed.headline, title) > 0.75;
                  if (headlineMatches && !nameMatches) {
                    metadata.title = parsed.headline;
                  } else {
                    metadata.title = parsed.name;
                  }
                } else if (typeof parsed.name === "string") {
                  metadata.title = parsed.name.trim();
                } else if (typeof parsed.headline === "string") {
                  metadata.title = parsed.headline.trim();
                }
                if (parsed.author) {
                  if (typeof parsed.author.name === "string") {
                    metadata.byline = parsed.author.name.trim();
                  } else if (Array.isArray(parsed.author) && parsed.author[0] && typeof parsed.author[0].name === "string") {
                    metadata.byline = parsed.author.filter(function(author) {
                      return author && typeof author.name === "string";
                    }).map(function(author) {
                      return author.name.trim();
                    }).join(", ");
                  }
                }
                if (typeof parsed.description === "string") {
                  metadata.excerpt = parsed.description.trim();
                }
                if (parsed.publisher && typeof parsed.publisher.name === "string") {
                  metadata.siteName = parsed.publisher.name.trim();
                }
                if (typeof parsed.datePublished === "string") {
                  metadata.datePublished = parsed.datePublished.trim();
                }
              } catch (err) {
                this.log(err.message);
              }
            }
          });
          return metadata ? metadata : {};
        },
        /**
         * Attempts to get excerpt and byline metadata for the article.
         *
         * @param {Object} jsonld — object containing any metadata that
         * could be extracted from JSON-LD object.
         *
         * @return Object with optional "excerpt" and "byline" properties
         */
        _getArticleMetadata(jsonld) {
          var metadata = {};
          var values = {};
          var metaElements = this._doc.getElementsByTagName("meta");
          var propertyPattern = /\s*(article|dc|dcterm|og|twitter)\s*:\s*(author|creator|description|published_time|title|site_name)\s*/gi;
          var namePattern = /^\s*(?:(dc|dcterm|og|twitter|parsely|weibo:(article|webpage))\s*[-\.:]\s*)?(author|creator|pub-date|description|title|site_name)\s*$/i;
          this._forEachNode(metaElements, function(element) {
            var elementName = element.getAttribute("name");
            var elementProperty = element.getAttribute("property");
            var content = element.getAttribute("content");
            if (!content) {
              return;
            }
            var matches = null;
            var name = null;
            if (elementProperty) {
              matches = elementProperty.match(propertyPattern);
              if (matches) {
                name = matches[0].toLowerCase().replace(/\s/g, "");
                values[name] = content.trim();
              }
            }
            if (!matches && elementName && namePattern.test(elementName)) {
              name = elementName;
              if (content) {
                name = name.toLowerCase().replace(/\s/g, "").replace(/\./g, ":");
                values[name] = content.trim();
              }
            }
          });
          metadata.title = jsonld.title || values["dc:title"] || values["dcterm:title"] || values["og:title"] || values["weibo:article:title"] || values["weibo:webpage:title"] || values.title || values["twitter:title"] || values["parsely-title"];
          if (!metadata.title) {
            metadata.title = this._getArticleTitle();
          }
          const articleAuthor = typeof values["article:author"] === "string" && !this._isUrl(values["article:author"]) ? values["article:author"] : void 0;
          metadata.byline = jsonld.byline || values["dc:creator"] || values["dcterm:creator"] || values.author || values["parsely-author"] || articleAuthor;
          metadata.excerpt = jsonld.excerpt || values["dc:description"] || values["dcterm:description"] || values["og:description"] || values["weibo:article:description"] || values["weibo:webpage:description"] || values.description || values["twitter:description"];
          metadata.siteName = jsonld.siteName || values["og:site_name"];
          metadata.publishedTime = jsonld.datePublished || values["article:published_time"] || values["parsely-pub-date"] || null;
          metadata.title = this._unescapeHtmlEntities(metadata.title);
          metadata.byline = this._unescapeHtmlEntities(metadata.byline);
          metadata.excerpt = this._unescapeHtmlEntities(metadata.excerpt);
          metadata.siteName = this._unescapeHtmlEntities(metadata.siteName);
          metadata.publishedTime = this._unescapeHtmlEntities(metadata.publishedTime);
          return metadata;
        },
        /**
         * Check if node is image, or if node contains exactly only one image
         * whether as a direct child or as its descendants.
         *
         * @param Element
         **/
        _isSingleImage(node) {
          while (node) {
            if (node.tagName === "IMG") {
              return true;
            }
            if (node.children.length !== 1 || node.textContent.trim() !== "") {
              return false;
            }
            node = node.children[0];
          }
          return false;
        },
        /**
         * Find all <noscript> that are located after <img> nodes, and which contain only one
         * <img> element. Replace the first image with the image from inside the <noscript> tag,
         * and remove the <noscript> tag. This improves the quality of the images we use on
         * some sites (e.g. Medium).
         *
         * @param Element
         **/
        _unwrapNoscriptImages(doc) {
          var imgs = Array.from(doc.getElementsByTagName("img"));
          this._forEachNode(imgs, function(img) {
            for (var i = 0; i < img.attributes.length; i++) {
              var attr = img.attributes[i];
              switch (attr.name) {
                case "src":
                case "srcset":
                case "data-src":
                case "data-srcset":
                  return;
              }
              if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                return;
              }
            }
            img.remove();
          });
          var noscripts = Array.from(doc.getElementsByTagName("noscript"));
          this._forEachNode(noscripts, function(noscript) {
            if (!this._isSingleImage(noscript)) {
              return;
            }
            var tmp = doc.createElement("div");
            tmp.innerHTML = noscript.innerHTML;
            var prevElement = noscript.previousElementSibling;
            if (prevElement && this._isSingleImage(prevElement)) {
              var prevImg = prevElement;
              if (prevImg.tagName !== "IMG") {
                prevImg = prevElement.getElementsByTagName("img")[0];
              }
              var newImg = tmp.getElementsByTagName("img")[0];
              for (var i = 0; i < prevImg.attributes.length; i++) {
                var attr = prevImg.attributes[i];
                if (attr.value === "") {
                  continue;
                }
                if (attr.name === "src" || attr.name === "srcset" || /\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                  if (newImg.getAttribute(attr.name) === attr.value) {
                    continue;
                  }
                  var attrName = attr.name;
                  if (newImg.hasAttribute(attrName)) {
                    attrName = "data-old-" + attrName;
                  }
                  newImg.setAttribute(attrName, attr.value);
                }
              }
              noscript.parentNode.replaceChild(tmp.firstElementChild, prevElement);
            }
          });
        },
        /**
         * Removes script tags from the document.
         *
         * @param Element
         **/
        _removeScripts(doc) {
          this._removeNodes(this._getAllNodesWithTag(doc, ["script", "noscript"]));
        },
        /**
         * Check if this node has only whitespace and a single element with given tag
         * Returns false if the DIV node contains non-empty text nodes
         * or if it contains no element with given tag or more than 1 element.
         *
         * @param Element
         * @param string tag of child element
         **/
        _hasSingleTagInsideElement(element, tag) {
          if (element.children.length != 1 || element.children[0].tagName !== tag) {
            return false;
          }
          return !this._someNode(element.childNodes, function(node) {
            return node.nodeType === this.TEXT_NODE && this.REGEXPS.hasContent.test(node.textContent);
          });
        },
        _isElementWithoutContent(node) {
          return node.nodeType === this.ELEMENT_NODE && !node.textContent.trim().length && (!node.children.length || node.children.length == node.getElementsByTagName("br").length + node.getElementsByTagName("hr").length);
        },
        /**
         * Determine whether element has any children block level elements.
         *
         * @param Element
         */
        _hasChildBlockElement(element) {
          return this._someNode(element.childNodes, function(node) {
            return this.DIV_TO_P_ELEMS.has(node.tagName) || this._hasChildBlockElement(node);
          });
        },
        /***
         * Determine if a node qualifies as phrasing content.
         * https://developer.mozilla.org/en-US/docs/Web/Guide/HTML/Content_categories#Phrasing_content
         **/
        _isPhrasingContent(node) {
          return node.nodeType === this.TEXT_NODE || this.PHRASING_ELEMS.includes(node.tagName) || (node.tagName === "A" || node.tagName === "DEL" || node.tagName === "INS") && this._everyNode(node.childNodes, this._isPhrasingContent);
        },
        _isWhitespace(node) {
          return node.nodeType === this.TEXT_NODE && node.textContent.trim().length === 0 || node.nodeType === this.ELEMENT_NODE && node.tagName === "BR";
        },
        /**
         * Get the inner text of a node - cross browser compatibly.
         * This also strips out any excess whitespace to be found.
         *
         * @param Element
         * @param Boolean normalizeSpaces (default: true)
         * @return string
         **/
        _getInnerText(e, normalizeSpaces) {
          normalizeSpaces = typeof normalizeSpaces === "undefined" ? true : normalizeSpaces;
          var textContent = e.textContent.trim();
          if (normalizeSpaces) {
            return textContent.replace(this.REGEXPS.normalize, " ");
          }
          return textContent;
        },
        /**
         * Get the number of times a string s appears in the node e.
         *
         * @param Element
         * @param string - what to split on. Default is ","
         * @return number (integer)
         **/
        _getCharCount(e, s) {
          s = s || ",";
          return this._getInnerText(e).split(s).length - 1;
        },
        /**
         * Remove the style attribute on every e and under.
         * TODO: Test if getElementsByTagName(*) is faster.
         *
         * @param Element
         * @return void
         **/
        _cleanStyles(e) {
          if (!e || e.tagName.toLowerCase() === "svg") {
            return;
          }
          for (var i = 0; i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
            e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i]);
          }
          if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.includes(e.tagName)) {
            e.removeAttribute("width");
            e.removeAttribute("height");
          }
          var cur = e.firstElementChild;
          while (cur !== null) {
            this._cleanStyles(cur);
            cur = cur.nextElementSibling;
          }
        },
        /**
         * Get the density of links as a percentage of the content
         * This is the amount of text that is inside a link divided by the total text in the node.
         *
         * @param Element
         * @return number (float)
         **/
        _getLinkDensity(element) {
          var textLength = this._getInnerText(element).length;
          if (textLength === 0) {
            return 0;
          }
          var linkLength = 0;
          this._forEachNode(element.getElementsByTagName("a"), function(linkNode) {
            var href = linkNode.getAttribute("href");
            var coefficient = href && this.REGEXPS.hashUrl.test(href) ? 0.3 : 1;
            linkLength += this._getInnerText(linkNode).length * coefficient;
          });
          return linkLength / textLength;
        },
        /**
         * Get an elements class/id weight. Uses regular expressions to tell if this
         * element looks good or bad.
         *
         * @param Element
         * @return number (Integer)
         **/
        _getClassWeight(e) {
          if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
            return 0;
          }
          var weight = 0;
          if (typeof e.className === "string" && e.className !== "") {
            if (this.REGEXPS.negative.test(e.className)) {
              weight -= 25;
            }
            if (this.REGEXPS.positive.test(e.className)) {
              weight += 25;
            }
          }
          if (typeof e.id === "string" && e.id !== "") {
            if (this.REGEXPS.negative.test(e.id)) {
              weight -= 25;
            }
            if (this.REGEXPS.positive.test(e.id)) {
              weight += 25;
            }
          }
          return weight;
        },
        /**
         * Clean a node of all elements of type "tag".
         * (Unless it's a youtube/vimeo video. People love movies.)
         *
         * @param Element
         * @param string tag to clean
         * @return void
         **/
        _clean(e, tag) {
          var isEmbed = ["object", "embed", "iframe"].includes(tag);
          this._removeNodes(this._getAllNodesWithTag(e, [tag]), function(element) {
            if (isEmbed) {
              for (var i = 0; i < element.attributes.length; i++) {
                if (this._allowedVideoRegex.test(element.attributes[i].value)) {
                  return false;
                }
              }
              if (element.tagName === "object" && this._allowedVideoRegex.test(element.innerHTML)) {
                return false;
              }
            }
            return true;
          });
        },
        /**
         * Check if a given node has one of its ancestor tag name matching the
         * provided one.
         * @param  HTMLElement node
         * @param  String      tagName
         * @param  Number      maxDepth
         * @param  Function    filterFn a filter to invoke to determine whether this node 'counts'
         * @return Boolean
         */
        _hasAncestorTag(node, tagName, maxDepth, filterFn) {
          maxDepth = maxDepth || 3;
          tagName = tagName.toUpperCase();
          var depth = 0;
          while (node.parentNode) {
            if (maxDepth > 0 && depth > maxDepth) {
              return false;
            }
            if (node.parentNode.tagName === tagName && (!filterFn || filterFn(node.parentNode))) {
              return true;
            }
            node = node.parentNode;
            depth++;
          }
          return false;
        },
        /**
         * Return an object indicating how many rows and columns this table has.
         */
        _getRowAndColumnCount(table) {
          var rows = 0;
          var columns = 0;
          var trs = table.getElementsByTagName("tr");
          for (var i = 0; i < trs.length; i++) {
            var rowspan = trs[i].getAttribute("rowspan") || 0;
            if (rowspan) {
              rowspan = parseInt(rowspan, 10);
            }
            rows += rowspan || 1;
            var columnsInThisRow = 0;
            var cells = trs[i].getElementsByTagName("td");
            for (var j = 0; j < cells.length; j++) {
              var colspan = cells[j].getAttribute("colspan") || 0;
              if (colspan) {
                colspan = parseInt(colspan, 10);
              }
              columnsInThisRow += colspan || 1;
            }
            columns = Math.max(columns, columnsInThisRow);
          }
          return { rows, columns };
        },
        /**
         * Look for 'data' (as opposed to 'layout') tables, for which we use
         * similar checks as
         * https://searchfox.org/mozilla-central/rev/f82d5c549f046cb64ce5602bfd894b7ae807c8f8/accessible/generic/TableAccessible.cpp#19
         */
        _markDataTables(root) {
          var tables = root.getElementsByTagName("table");
          for (var i = 0; i < tables.length; i++) {
            var table = tables[i];
            var role = table.getAttribute("role");
            if (role == "presentation") {
              table._readabilityDataTable = false;
              continue;
            }
            var datatable = table.getAttribute("datatable");
            if (datatable == "0") {
              table._readabilityDataTable = false;
              continue;
            }
            var summary = table.getAttribute("summary");
            if (summary) {
              table._readabilityDataTable = true;
              continue;
            }
            var caption = table.getElementsByTagName("caption")[0];
            if (caption && caption.childNodes.length) {
              table._readabilityDataTable = true;
              continue;
            }
            var dataTableDescendants = ["col", "colgroup", "tfoot", "thead", "th"];
            var descendantExists = function(tag) {
              return !!table.getElementsByTagName(tag)[0];
            };
            if (dataTableDescendants.some(descendantExists)) {
              this.log("Data table because found data-y descendant");
              table._readabilityDataTable = true;
              continue;
            }
            if (table.getElementsByTagName("table")[0]) {
              table._readabilityDataTable = false;
              continue;
            }
            var sizeInfo = this._getRowAndColumnCount(table);
            if (sizeInfo.columns == 1 || sizeInfo.rows == 1) {
              table._readabilityDataTable = false;
              continue;
            }
            if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
              table._readabilityDataTable = true;
              continue;
            }
            table._readabilityDataTable = sizeInfo.rows * sizeInfo.columns > 10;
          }
        },
        /* convert images and figures that have properties like data-src into images that can be loaded without JS */
        _fixLazyImages(root) {
          this._forEachNode(
            this._getAllNodesWithTag(root, ["img", "picture", "figure"]),
            function(elem) {
              if (elem.src && this.REGEXPS.b64DataUrl.test(elem.src)) {
                var parts = this.REGEXPS.b64DataUrl.exec(elem.src);
                if (parts[1] === "image/svg+xml") {
                  return;
                }
                var srcCouldBeRemoved = false;
                for (var i = 0; i < elem.attributes.length; i++) {
                  var attr = elem.attributes[i];
                  if (attr.name === "src") {
                    continue;
                  }
                  if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
                    srcCouldBeRemoved = true;
                    break;
                  }
                }
                if (srcCouldBeRemoved) {
                  var b64starts = parts[0].length;
                  var b64length = elem.src.length - b64starts;
                  if (b64length < 133) {
                    elem.removeAttribute("src");
                  }
                }
              }
              if ((elem.src || elem.srcset && elem.srcset != "null") && !elem.className.toLowerCase().includes("lazy")) {
                return;
              }
              for (var j = 0; j < elem.attributes.length; j++) {
                attr = elem.attributes[j];
                if (attr.name === "src" || attr.name === "srcset" || attr.name === "alt") {
                  continue;
                }
                var copyTo = null;
                if (/\.(jpg|jpeg|png|webp)\s+\d/.test(attr.value)) {
                  copyTo = "srcset";
                } else if (/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(attr.value)) {
                  copyTo = "src";
                }
                if (copyTo) {
                  if (elem.tagName === "IMG" || elem.tagName === "PICTURE") {
                    elem.setAttribute(copyTo, attr.value);
                  } else if (elem.tagName === "FIGURE" && !this._getAllNodesWithTag(elem, ["img", "picture"]).length) {
                    var img = this._doc.createElement("img");
                    img.setAttribute(copyTo, attr.value);
                    elem.appendChild(img);
                  }
                }
              }
            }
          );
        },
        _getTextDensity(e, tags) {
          var textLength = this._getInnerText(e, true).length;
          if (textLength === 0) {
            return 0;
          }
          var childrenLength = 0;
          var children = this._getAllNodesWithTag(e, tags);
          this._forEachNode(
            children,
            (child) => childrenLength += this._getInnerText(child, true).length
          );
          return childrenLength / textLength;
        },
        /**
         * Clean an element of all tags of type "tag" if they look fishy.
         * "Fishy" is an algorithm based on content length, classnames, link density, number of images & embeds, etc.
         *
         * @return void
         **/
        _cleanConditionally(e, tag) {
          if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
            return;
          }
          this._removeNodes(this._getAllNodesWithTag(e, [tag]), function(node) {
            var isDataTable = function(t) {
              return t._readabilityDataTable;
            };
            var isList = tag === "ul" || tag === "ol";
            if (!isList) {
              var listLength = 0;
              var listNodes = this._getAllNodesWithTag(node, ["ul", "ol"]);
              this._forEachNode(
                listNodes,
                (list) => listLength += this._getInnerText(list).length
              );
              isList = listLength / this._getInnerText(node).length > 0.9;
            }
            if (tag === "table" && isDataTable(node)) {
              return false;
            }
            if (this._hasAncestorTag(node, "table", -1, isDataTable)) {
              return false;
            }
            if (this._hasAncestorTag(node, "code")) {
              return false;
            }
            if ([...node.getElementsByTagName("table")].some(
              (tbl) => tbl._readabilityDataTable
            )) {
              return false;
            }
            var weight = this._getClassWeight(node);
            this.log("Cleaning Conditionally", node);
            var contentScore = 0;
            if (weight + contentScore < 0) {
              return true;
            }
            if (this._getCharCount(node, ",") < 10) {
              var p = node.getElementsByTagName("p").length;
              var img = node.getElementsByTagName("img").length;
              var li = node.getElementsByTagName("li").length - 100;
              var input = node.getElementsByTagName("input").length;
              var headingDensity = this._getTextDensity(node, [
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6"
              ]);
              var embedCount = 0;
              var embeds = this._getAllNodesWithTag(node, [
                "object",
                "embed",
                "iframe"
              ]);
              for (var i = 0; i < embeds.length; i++) {
                for (var j = 0; j < embeds[i].attributes.length; j++) {
                  if (this._allowedVideoRegex.test(embeds[i].attributes[j].value)) {
                    return false;
                  }
                }
                if (embeds[i].tagName === "object" && this._allowedVideoRegex.test(embeds[i].innerHTML)) {
                  return false;
                }
                embedCount++;
              }
              var innerText = this._getInnerText(node);
              if (this.REGEXPS.adWords.test(innerText) || this.REGEXPS.loadingWords.test(innerText)) {
                return true;
              }
              var contentLength = innerText.length;
              var linkDensity = this._getLinkDensity(node);
              var textishTags = ["SPAN", "LI", "TD"].concat(
                Array.from(this.DIV_TO_P_ELEMS)
              );
              var textDensity = this._getTextDensity(node, textishTags);
              var isFigureChild = this._hasAncestorTag(node, "figure");
              const shouldRemoveNode = () => {
                const errs = [];
                if (!isFigureChild && img > 1 && p / img < 0.5) {
                  errs.push(`Bad p to img ratio (img=${img}, p=${p})`);
                }
                if (!isList && li > p) {
                  errs.push(`Too many li's outside of a list. (li=${li} > p=${p})`);
                }
                if (input > Math.floor(p / 3)) {
                  errs.push(`Too many inputs per p. (input=${input}, p=${p})`);
                }
                if (!isList && !isFigureChild && headingDensity < 0.9 && contentLength < 25 && (img === 0 || img > 2) && linkDensity > 0) {
                  errs.push(
                    `Suspiciously short. (headingDensity=${headingDensity}, img=${img}, linkDensity=${linkDensity})`
                  );
                }
                if (!isList && weight < 25 && linkDensity > 0.2 + this._linkDensityModifier) {
                  errs.push(
                    `Low weight and a little linky. (linkDensity=${linkDensity})`
                  );
                }
                if (weight >= 25 && linkDensity > 0.5 + this._linkDensityModifier) {
                  errs.push(
                    `High weight and mostly links. (linkDensity=${linkDensity})`
                  );
                }
                if (embedCount === 1 && contentLength < 75 || embedCount > 1) {
                  errs.push(
                    `Suspicious embed. (embedCount=${embedCount}, contentLength=${contentLength})`
                  );
                }
                if (img === 0 && textDensity === 0) {
                  errs.push(
                    `No useful content. (img=${img}, textDensity=${textDensity})`
                  );
                }
                if (errs.length) {
                  this.log("Checks failed", errs);
                  return true;
                }
                return false;
              };
              var haveToRemove = shouldRemoveNode();
              if (isList && haveToRemove) {
                for (var x = 0; x < node.children.length; x++) {
                  let child = node.children[x];
                  if (child.children.length > 1) {
                    return haveToRemove;
                  }
                }
                let li_count = node.getElementsByTagName("li").length;
                if (img == li_count) {
                  return false;
                }
              }
              return haveToRemove;
            }
            return false;
          });
        },
        /**
         * Clean out elements that match the specified conditions
         *
         * @param Element
         * @param Function determines whether a node should be removed
         * @return void
         **/
        _cleanMatchedNodes(e, filter) {
          var endOfSearchMarkerNode = this._getNextNode(e, true);
          var next = this._getNextNode(e);
          while (next && next != endOfSearchMarkerNode) {
            if (filter.call(this, next, next.className + " " + next.id)) {
              next = this._removeAndGetNext(next);
            } else {
              next = this._getNextNode(next);
            }
          }
        },
        /**
         * Clean out spurious headers from an Element.
         *
         * @param Element
         * @return void
         **/
        _cleanHeaders(e) {
          let headingNodes = this._getAllNodesWithTag(e, ["h1", "h2"]);
          this._removeNodes(headingNodes, function(node) {
            let shouldRemove = this._getClassWeight(node) < 0;
            if (shouldRemove) {
              this.log("Removing header with low class weight:", node);
            }
            return shouldRemove;
          });
        },
        /**
         * Check if this node is an H1 or H2 element whose content is mostly
         * the same as the article title.
         *
         * @param Element  the node to check.
         * @return boolean indicating whether this is a title-like header.
         */
        _headerDuplicatesTitle(node) {
          if (node.tagName != "H1" && node.tagName != "H2") {
            return false;
          }
          var heading = this._getInnerText(node, false);
          this.log("Evaluating similarity of header:", heading, this._articleTitle);
          return this._textSimilarity(this._articleTitle, heading) > 0.75;
        },
        _flagIsActive(flag) {
          return (this._flags & flag) > 0;
        },
        _removeFlag(flag) {
          this._flags = this._flags & ~flag;
        },
        _isProbablyVisible(node) {
          return (!node.style || node.style.display != "none") && (!node.style || node.style.visibility != "hidden") && !node.hasAttribute("hidden") && //check for "fallback-image" so that wikimedia math images are displayed
          (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || node.className && node.className.includes && node.className.includes("fallback-image"));
        },
        /**
         * Runs readability.
         *
         * Workflow:
         *  1. Prep the document by removing script tags, css, etc.
         *  2. Build readability's DOM tree.
         *  3. Grab the article content from the current dom tree.
         *  4. Replace the current DOM tree with the new one.
         *  5. Read peacefully.
         *
         * @return void
         **/
        parse() {
          if (this._maxElemsToParse > 0) {
            var numTags = this._doc.getElementsByTagName("*").length;
            if (numTags > this._maxElemsToParse) {
              throw new Error(
                "Aborting parsing document; " + numTags + " elements found"
              );
            }
          }
          this._unwrapNoscriptImages(this._doc);
          var jsonLd = this._disableJSONLD ? {} : this._getJSONLD(this._doc);
          this._removeScripts(this._doc);
          this._prepDocument();
          var metadata = this._getArticleMetadata(jsonLd);
          this._metadata = metadata;
          this._articleTitle = metadata.title;
          var articleContent = this._grabArticle();
          if (!articleContent) {
            return null;
          }
          this.log("Grabbed: " + articleContent.innerHTML);
          this._postProcessContent(articleContent);
          if (!metadata.excerpt) {
            var paragraphs = articleContent.getElementsByTagName("p");
            if (paragraphs.length) {
              metadata.excerpt = paragraphs[0].textContent.trim();
            }
          }
          var textContent = articleContent.textContent;
          return {
            title: this._articleTitle,
            byline: metadata.byline || this._articleByline,
            dir: this._articleDir,
            lang: this._articleLang,
            content: this._serializer(articleContent),
            textContent,
            length: textContent.length,
            excerpt: metadata.excerpt,
            siteName: metadata.siteName || this._articleSiteName,
            publishedTime: metadata.publishedTime
          };
        }
      };
      if (typeof module === "object") {
        module.exports = Readability2;
      }
    }
  });

  // node_modules/@mozilla/readability/Readability-readerable.js
  var require_Readability_readerable = __commonJS({
    "node_modules/@mozilla/readability/Readability-readerable.js"(exports, module) {
      var REGEXPS = {
        // NOTE: These two regular expressions are duplicated in
        // Readability.js. Please keep both copies in sync.
        unlikelyCandidates: /-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
        okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i
      };
      function isNodeVisible(node) {
        return (!node.style || node.style.display != "none") && !node.hasAttribute("hidden") && //check for "fallback-image" so that wikimedia math images are displayed
        (!node.hasAttribute("aria-hidden") || node.getAttribute("aria-hidden") != "true" || node.className && node.className.includes && node.className.includes("fallback-image"));
      }
      function isProbablyReaderable(doc, options = {}) {
        if (typeof options == "function") {
          options = { visibilityChecker: options };
        }
        var defaultOptions = {
          minScore: 20,
          minContentLength: 140,
          visibilityChecker: isNodeVisible
        };
        options = Object.assign(defaultOptions, options);
        var nodes = doc.querySelectorAll("p, pre, article");
        var brNodes = doc.querySelectorAll("div > br");
        if (brNodes.length) {
          var set = new Set(nodes);
          [].forEach.call(brNodes, function(node) {
            set.add(node.parentNode);
          });
          nodes = Array.from(set);
        }
        var score = 0;
        return [].some.call(nodes, function(node) {
          if (!options.visibilityChecker(node)) {
            return false;
          }
          var matchString = node.className + " " + node.id;
          if (REGEXPS.unlikelyCandidates.test(matchString) && !REGEXPS.okMaybeItsACandidate.test(matchString)) {
            return false;
          }
          if (node.matches("li p")) {
            return false;
          }
          var textContentLength = node.textContent.trim().length;
          if (textContentLength < options.minContentLength) {
            return false;
          }
          score += Math.sqrt(textContentLength - options.minContentLength);
          if (score > options.minScore) {
            return true;
          }
          return false;
        });
      }
      if (typeof module === "object") {
        module.exports = isProbablyReaderable;
      }
    }
  });

  // node_modules/@mozilla/readability/index.js
  var require_readability = __commonJS({
    "node_modules/@mozilla/readability/index.js"(exports, module) {
      var Readability2 = require_Readability();
      var isProbablyReaderable = require_Readability_readerable();
      module.exports = {
        Readability: Readability2,
        isProbablyReaderable
      };
    }
  });

  // src/extractors/base.ts
  function mergeResults(results) {
    const merged = {};
    let highestConfidence = 0;
    let textMethod = "";
    for (const r of results) {
      if (r.confidence > highestConfidence) {
        highestConfidence = r.confidence;
      }
      if (r.title && !merged.superabstract) merged.superabstract = r.title;
      if (r.author && !merged.autor) merged.autor = r.author;
      if (r.date && !merged.fecha) merged.fecha = r.date;
      if (r.content) {
        if (!merged.texto) {
          merged.texto = r.content;
          textMethod = r.method;
        } else {
          const isNewSiteSpecific = r.method === "site-specific";
          const isPrevSiteSpecific = textMethod === "site-specific";
          const isMuchLonger = r.content.length > merged.texto.length * 1.3;
          const isPrevShortTeaser = merged.texto.length < 500;
          let shouldOverwrite = false;
          if (isNewSiteSpecific && !isPrevSiteSpecific && isPrevShortTeaser && r.content.length > merged.texto.length) {
            shouldOverwrite = true;
          } else if (isMuchLonger) {
            const isNewLowConfidence = r.method === "generic" || r.method === "meta-tags";
            const isPrevHighConfidence = textMethod === "json-ld" || textMethod === "site-specific";
            if (isNewLowConfidence && isPrevHighConfidence) {
              if (isPrevShortTeaser) {
                shouldOverwrite = true;
              }
            } else {
              if (!isPrevSiteSpecific || isNewSiteSpecific) {
                shouldOverwrite = true;
              }
            }
          }
          if (shouldOverwrite) {
            merged.texto = r.content;
            textMethod = r.method;
          }
        }
      }
      if (r.subtitle && !merged.subtitulo) merged.subtitulo = r.subtitle;
      if (r.section && !merged.seccion) merged.seccion = r.section;
      if (r.imageUrls?.length && !merged.imageUrls) merged.imageUrls = r.imageUrls;
      if (r.url && !merged.url) merged.url = r.url;
      if (r.paywallDetected) merged.paywallDetected = true;
    }
    merged.confidence = highestConfidence;
    if (!merged.paywallDetected) merged.paywallDetected = false;
    if (!merged.isFullContent) merged.isFullContent = (merged.texto?.length || 0) > 200;
    return merged;
  }

  // src/extractors/jsonld.ts
  function extractJsonLd() {
    const result = { method: "json-ld", confidence: 0 };
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (const script of Array.from(scripts)) {
        let data;
        try {
          data = JSON.parse(script.textContent || "");
        } catch {
          continue;
        }
        const items = Array.isArray(data) ? data : [data];
        for (const item of items) {
          const type = item["@type"];
          if (type === "NewsArticle" || type === "Article" || type === "ReportageNewsArticle" || Array.isArray(type) && type.some((t) => ["NewsArticle", "Article"].includes(t))) {
            result.title = item.headline || item.name || result.title;
            result.date = item.datePublished || result.date;
            result.content = item.articleBody || result.content;
            result.author = typeof item.author === "object" ? item.author?.name || item.author?.[0]?.name : item.author || result.author;
            result.publisherName = item.publisher?.name || result.publisherName;
            result.publisherLogo = item.publisher?.logo?.url || result.publisherLogo;
            result.imageUrls = item.image ? typeof item.image === "string" ? [item.image] : Array.isArray(item.image) ? item.image.map((i) => typeof i === "string" ? i : i.url) : [] : result.imageUrls;
            result.confidence = 0.95;
          }
          if (item["@graph"]) {
            for (const g of item["@graph"]) {
              if (g["@type"] === "NewsArticle" || g["@type"] === "Article") {
                result.title = g.headline || g.name || result.title;
                result.date = g.datePublished || result.date;
                result.content = g.articleBody || result.content;
                result.confidence = Math.max(result.confidence, 0.9);
              }
            }
          }
        }
      }
    } catch (e) {
    }
    return result;
  }

  // src/extractors/meta.ts
  function extractMetaTags() {
    const res = { method: "meta-tags", confidence: 0.65 };
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute("content");
    const ogDesc = document.querySelector('meta[property="og:description"]')?.getAttribute("content");
    const ogImage = document.querySelector('meta[property="og:image"]')?.getAttribute("content");
    const ogUrl = document.querySelector('meta[property="og:url"]')?.getAttribute("content");
    const twTitle = document.querySelector('meta[name="twitter:title"]')?.getAttribute("content");
    res.title = ogTitle || twTitle || void 0;
    res.content = ogDesc || void 0;
    res.url = ogUrl || void 0;
    if (ogImage) res.imageUrls = [ogImage];
    const author = document.querySelector('meta[name="author"]')?.getAttribute("content");
    if (author) res.author = author;
    const pub = document.querySelector('meta[property="article:published_time"]')?.getAttribute("content");
    if (pub) res.date = pub;
    const section = document.querySelector('meta[property="article:section"]')?.getAttribute("content");
    if (section) res.section = section;
    const tags = Array.from(document.querySelectorAll('meta[property="article:tag"]')).map((m) => m.getAttribute("content")).filter(Boolean);
    if (tags.length) res.content = (res.content || "") + "\n\nTags: " + tags.join(", ");
    res.confidence = res.title || res.content ? 0.75 : 0.5;
    return res;
  }

  // src/extractors/siteSpecific.ts
  var SITE_CONFIGS = {
    "wsj.com": {
      name: "Wall Street Journal",
      hostPatterns: ["wsj.com"],
      selectors: {
        title: 'h1.wsj-article-headline, h1[class*="StyledHeadline"], h1[data-testid="headline"], h1',
        author: '.author-name, [class*="AuthorName"], [data-testid="author-name"]',
        date: "time[datetime]",
        content: 'article section p, article p, section[name="articleBody"] p, .wsj-article-body p, [itemprop="articleBody"] p, [class*="article-body"] p, [class*="ArticleBody"] p',
        paywall: ".wsj-snippet-login, #cx-snippet-overlay, .paywall-container, #gateway-content"
      },
      brandColor: "#ffffff",
      logoHtml: `<div class="brand-text-logo" style="font-family: 'Libre Bodoni', 'Playfair Display', 'Times New Roman', serif; font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.01em; line-height: 1;">The Wall Street Journal</div>`,
      logoAsset: "src/assets/logos/wsj.png"
    },
    "nytimes.com": {
      name: "New York Times",
      hostPatterns: ["nytimes.com"],
      selectors: {
        title: 'h1[data-testid="headline"], h1.e1h9f4f0',
        author: '[class*="byline"] a, span[class*="last-byline"], [data-testid="byline"]',
        date: "time[datetime]",
        content: 'section[name="articleBody"] p, .article-body p',
        paywall: '#gateway-content, [data-testid="inline-message"], .paywall-container'
      }
    },
    "eleconomista.com": {
      name: "El Economista",
      hostPatterns: ["eleconomista.com.mx", "eleconomista.com"],
      selectors: {
        title: 'h1.article-title, h1, [class*="title" i]',
        author: '.article-author, .author, [itemprop="author"]',
        date: "time[datetime], .article-date",
        content: '.article-body p, article p, [class*="body" i] p',
        paywall: ".paywall, #paywall"
      },
      brandColor: "#1a1a1a",
      logoHtml: '<svg xmlns="http://www.w3.org/2000/svg" width="172" height="16" version="1.1" viewBox="0 0 439 40" style="display: block; max-height: 24px; width: auto;"><defs><style>.cls-1{fill:#fff;}.cls-2{fill:#00b1eb;}</style></defs><g><g id="Layer_1"><g id="Layer_1-2" data-name="Layer_1"><path class="cls-1" d="M417.5,9.7l4.8,14.6h-9.7l4.7-14.6s.2,0,.2,0ZM409.2,35.1l3.2-9.9h10.3l4,11.8-3.6.4v.6h15.8v-.6l-2.2-.4-14.1-35.1-4.8,3.3-9.7,29.9-5.5,2.3v.6h12.1v-.6l-5.5-2.3h0Z"></path><polygon class="cls-1" points="91.5 37.1 91.5 3.2 94.6 2.9 94.6 2.1 80.2 2.1 80.2 2.9 83.3 3.2 83.3 36.8 80.2 37.1 80.2 38 107.4 38 107.9 29.1 107.4 29.1 101.5 36.8 91.5 37.1"></polygon><polygon class="cls-1" points="133.1 2.9 142.6 3.2 148.2 10.9 148.7 10.9 148.5 2.1 121.8 2.1 121.8 2.9 124.9 3.2 124.9 36.8 121.8 37.1 121.8 38 149 38 149.5 29.1 149 29.1 143.1 36.8 133.1 37.1 133.1 20.5 140.3 20.8 143.1 26.4 143.6 26.4 143.6 13.3 143.1 13.3 140.3 19.2 133.1 19.5 133.1 2.9"></polygon><polygon class="cls-1" points="335.2 37 335.2 38 349.4 38 349.4 37 346.3 36.6 346.3 3.3 349.4 2.9 349.4 2.1 335.2 2.1 335.2 2.9 338.2 3.3 338.2 36.6 335.2 37"></polygon><polygon class="cls-1" points="61.1 2.9 70.5 3.2 76.1 10.9 76.6 10.9 76.4 2.1 49.7 2.1 49.7 2.9 52.8 3.2 52.8 36.8 49.7 37.1 49.7 38 76.9 38 77.4 29.1 76.9 29.1 71 36.8 61.1 37.1 61.1 20.5 68.2 20.8 71 26.4 71.5 26.4 71.5 13.3 71 13.3 68.2 19.2 61.1 19.5 61.1 2.9"></polygon><path class="cls-1" d="M191.2,20c0-11.5,3-17.3,9.5-17.3s9.5,5.8,9.5,17.3-3,17.3-9.5,17.3-9.5-5.8-9.5-17.3M182.6,20c0,10.5,8.6,18.1,18.1,18.1s18.1-7.6,18.1-18.1S210.2,1.9,200.7,1.9s-18.1,7.6-18.1,18.1"></path><path class="cls-1" d="M180,35l.5-8.5h-.5l-3.5,5.9c-1,1.8-3.8,4.9-7,4.9-7,0-10-5.8-10-17.3s3.5-17.3,10-17.3,5.8,3.1,6.8,4.9l3.5,5.9h.5l-.3-8.5c-2-1.3-6.5-3.1-11.6-3.1-10.6,0-17.6,7.6-17.6,18.1s7,18.1,17.6,18.1,9.5-1.9,11.6-3.1"></path><polygon class="cls-1" points="246.7 24.2 231.6 2.1 218.9 2.1 218.9 2.9 224.3 3.1 224.3 35.1 218.9 37.3 218.9 38 231.1 38 231.1 37.3 225.4 35.1 225.2 7.7 225.5 7.7 246.8 38.1 248 38.1 248 4.9 253.5 2.7 253.5 2.2 241.3 2.2 241.3 2.7 246.9 4.9 247.1 24.2 246.7 24.2"></polygon><path class="cls-1" d="M262.5,20c0-11.5,3-17.3,9.5-17.3s9.5,5.8,9.5,17.3-3,17.3-9.5,17.3-9.5-5.8-9.5-17.3M253.9,20c0,10.5,8.6,18.1,18.1,18.1s18.1-7.6,18.1-18.1-8.6-18.1-18.1-18.1-18.1,7.6-18.1,18.1"></path><polygon class="cls-1" points="313.8 24.7 304.2 2.1 290.7 2.1 290.7 2.9 296.1 3.3 296.1 35 290.7 37.3 290.7 37.9 302.9 37.9 302.9 37.3 297.2 35 297 7.7 297.3 7.7 310 37.8 311.1 37.8 320.8 5.7 321.2 5.7 321.2 36.7 318.1 37.2 318.1 38 332.4 38 332.4 37.2 329.3 36.7 329.3 3.2 332.4 2.8 332.4 2.1 321 2.1 314.1 24.7 313.8 24.7"></polygon><path class="cls-1" d="M354.2,35c2.8,1.8,6,3.1,9.7,3.1,6.7,0,12.7-3.6,12.7-11.1s-5.8-9.8-10.8-11.8c-3.6-1.5-7-3.3-7-7s4.5-5.5,6.2-5.5c3.4,0,5.7,2,7.9,6.8.5,1.1,1,2.2,1.5,3.3h.5l-.3-10.5h-.5l-.5,2.1c-2.1-1.4-5.6-2.4-8.7-2.4-6.9,0-12.4,3.7-12.4,10.1s5.1,8.9,10.2,11c3.8,1.6,7.6,3.8,7.6,8s-3.3,6.3-6.4,6.3-6.9-2.6-9-7.3c-.5-1.2-1-2.4-1.5-3.5h-.5l.2,11.3h.5l.5-2.8h0Z"></path><polygon class="cls-1" points="378.4 10.8 378.9 10.8 384.5 3.3 388.5 3 388.5 36.8 385.5 37.2 385.5 37.9 399.7 37.9 399.7 37.2 396.7 36.8 396.7 3 400.7 3.3 406.3 10.8 406.8 10.8 406.6 2.1 378.6 2.1 378.4 10.8"></polygon><path class="cls-2" d="M41.3,16.3h0s0-.1,0-.1c0,0,0,0,0,.1h0c-1.9,7-7.4,12.7-14.9,14.6-11.1,2.7-22.3-6.5-24.4-14.8-.4-2.2-.2-2.3-.1-3.1v.6c.4,2.2,1.4,4.4,3.1,6.3,5.6,6.3,16.8,8.3,24.9,3.8,8-4.4,9.8-13.2,4.1-19.7C32.3,2.3,30.5,1,28.5,0h0S28.3,0,28.3.2s0,0,0,.1h0c4.8,6,3.8,14.2-2.5,18.7-6.6,4.7-16.2,3.4-21.4-2.5-1.1-1.2-2-2.8-2.3-3.7,0-.2,0-.5-.2-.7h0c1.2,1,4.9,3.6,9.7,3.6,15.5,0,14-14.6,3.7-14.7-2.9,0-6.1,1.1-9.4,3.9-1.8,1.9-3.2,3.6-4.4,6.6h0s-.8,1.9-1.1,3.4c0,.4-.2.9-.2,1.3C.1,16.9,0,17.4,0,18.1c-.6,11.2,8.1,21.3,19.7,21.8,7.4.4,14.1-3.2,18.1-8.9h0c-4.5,5-11.6,7.7-19,6.6C8.3,36,1,27.3.6,17.8c0-.5,0-1.1.3-2.5h0c0,.6,0,1.3.2,2,1.8,10.9,12.3,19,23.5,17.4,9.4-1.4,16.2-9.1,16.7-18.4h0"></path></g></g></g></svg>',
      contentBgColor: "#fdf8eb",
      bodyFontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      titleFontFamily: "'Playfair Display', 'Lora', serif"
    },
    "reuters.com": {
      name: "Reuters",
      hostPatterns: ["reuters.com"],
      selectors: {
        title: 'h1[data-testid="Heading"], h1.article-header__title',
        author: '[data-testid="AuthorName"], a[href*="/authors/"]',
        date: "time[datetime]",
        content: '[data-testid*="paragraph"], .article-body__content p, .StandardArticleBody__article-body p',
        paywall: ".paywall-container"
      }
    },
    "ft.com": {
      name: "Financial Times",
      hostPatterns: ["ft.com"],
      selectors: {
        title: ".article-headline, .topper__headline, h1",
        author: ".article__author-name, .topper__standfirst, .author-name",
        date: "time[datetime], .article-info__timestamp",
        content: ".article__content-body p, .body-content p, .article-body p",
        paywall: ".barrier, .o-barrier, .login-overlay"
      }
    },
    "washingtonpost.com": {
      name: "Washington Post",
      hostPatterns: ["washingtonpost.com"],
      selectors: {
        title: 'h1[data-qa="headline"], h1.headline',
        author: '.author-name a, [data-qa="author-name"]',
        date: 'time[datetime], [data-qa="display-date"]',
        content: '.article-body p, [data-qa="article-body"] p',
        paywall: ".paywall-overlay, #paywall-offer"
      }
    },
    "elpais.com": {
      name: "El Pa\xEDs",
      hostPatterns: ["elpais.com"],
      selectors: {
        title: "h1.a_t, h1.c_t, h1.article-header__title",
        author: '.a_md_a_n, .author-name, [data-testid="author"]',
        date: "time[datetime]",
        content: '.a_c p, .article-body p, [data-testid="article-body"] p',
        paywall: ".a_tp, #ctn_freemium_article, .mura-wall, .paywall"
      },
      brandColor: "#ffffff",
      logoHtml: '<img src="https://static.elpais.com/dist/resources/images/logos/primary/el-pais-50.svg" alt="EL PA\xCDS" class="extracted-img-logo" style="height: 30px;" />'
    },
    "eluniversal.com.mx": {
      name: "El Universal",
      hostPatterns: ["eluniversal.com.mx"],
      selectors: {
        title: "h1.title, h1.article-title",
        author: ".sc__author-nota, .author",
        date: "time[datetime], .sc__author--date",
        content: ".sc__font-paragraph, .sc__header, .sc__paragraph-list li, .story-content p, .timeline-card p",
        paywall: ".paywall, .premium-banner"
      },
      brandColor: "#ffffff"
    },
    "reforma.com": {
      name: "Reforma",
      hostPatterns: ["reforma.com"],
      selectors: {
        title: "h1.article-title, #MainContent h1, h1.title",
        author: '.author, .article-author, .byline, [name="cXenseParse:author"]',
        date: 'time[datetime], .date, meta[name="cXenseParse:recs:publishtime"]',
        content: ".gr_texto_articulo, .article-body p, #article-body p",
        section: '.article-kicker, [class*="kicker" i]',
        paywall: ".paywall, .subscription-wall, #caja_suscripcion"
      },
      brandColor: "#ffffff",
      logoAsset: "src/assets/logos/reforma.png",
      bodyFontFamily: "'Lora', Georgia, serif",
      titleFontFamily: "'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif"
    },
    "milenio.com": {
      name: "Milenio",
      hostPatterns: ["milenio.com"],
      selectors: {
        title: "h1.content-title, h1.title, .article-title",
        author: '.author-name, .content-author, [data-testid="author-name"]',
        date: "time[datetime]",
        content: ".content-body p, .article-body p",
        paywall: ".paywall, .subscription-overlay"
      },
      brandColor: "#b31b21",
      logoHtml: '<div class="brand-text-logo milenio-font">MILENIO <span class="registered">\xAE</span></div>'
    },
    "pressreader.com": {
      name: "PressReader",
      hostPatterns: ["pressreader.com"],
      selectors: {
        // PressReader es una SPA — estas clases se renderizan dinámicamente.
        // El Text View es el más accesible para extracción.
        title: [
          ".article-title",
          ".v-textview h1",
          ".text-view-title",
          ".article-headline",
          '[class*="articleTitle"]',
          '[class*="ArticleTitle"]',
          ".content-title",
          "h1"
        ].join(", "),
        author: [
          ".article-author",
          ".v-textview .byline",
          '[class*="articleAuthor"]',
          '[class*="author"]',
          ".byline"
        ].join(", "),
        date: [
          ".article-date",
          ".v-textview .date",
          '[class*="articleDate"]',
          "time[datetime]"
        ].join(", "),
        content: [
          ".v-textview .body p",
          ".v-textview p",
          ".text-view-content p",
          ".article-body p",
          ".article-text p",
          '[class*="articleBody"] p',
          '[class*="ArticleBody"] p',
          '[class*="article-content"] p',
          ".content-body p"
        ].join(", "),
        paywall: ""
      }
    },
    "bloomberg.com": {
      name: "Bloomberg",
      hostPatterns: ["bloomberg.com"],
      selectors: {
        title: 'h1[data-component="headline"], h1[class*="ArticleHeadline"], h1[class*="headline"], h1',
        author: '[class*="articleBylineAuthors"], [class*="byline"], a[rel="author"]',
        date: "time[datetime]",
        content: '.body-content p, p[class*="articleBodyContent"], p[class*="articleBody"], p[class*="typography_articleBody"], article p',
        paywall: '.paywall-container, #paywall-banner, [class*="paywall"]'
      }
    }
  };
  function querySelectorText(selector) {
    if (!selector) return "";
    const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      try {
        const el = document.querySelector(part);
        if (el) {
          let text = (el.textContent || "").trim();
          text = text.replace(/^Article(?=[A-ZÁÉÍÓÚÑÜ“”"'])/, "");
          if (text.length > 0) return text;
        }
      } catch {
      }
    }
    return "";
  }
  function collectText(selector) {
    const articleParent = document.querySelector("article.current, article.first-story, article");
    if (articleParent && window.location.hostname.includes("bloomberg.com")) {
      const parts = selector.split(",").map((s) => s.trim()).filter(Boolean);
      const nodes2 = [];
      for (const part of parts) {
        let cleanPart = part;
        if (part.startsWith("article ")) {
          cleanPart = part.substring(8);
        }
        try {
          const found = articleParent.querySelectorAll(cleanPart);
          found.forEach((n) => {
            if (!nodes2.includes(n)) nodes2.push(n);
          });
        } catch {
        }
      }
      const sortedNodes = Array.from(nodes2).sort((a, b) => {
        const position = a.compareDocumentPosition(b);
        if (position & 4) return -1;
        if (position & 2) return 1;
        return 0;
      });
      return sortedNodes.map((n) => {
        const el = n;
        return (el.innerText || el.textContent || "").trim();
      }).filter(Boolean).join("\n\n");
    }
    const nodes = document.querySelectorAll(selector);
    return Array.from(nodes).map((n) => {
      const el = n;
      return (el.innerText || el.textContent || "").trim();
    }).filter(Boolean).join("\n\n");
  }
  function cleanBloombergText(text) {
    const paragraphs = text.split("\n\n").map((p) => p.trim()).filter(Boolean);
    const filtered = paragraphs.filter((p) => {
      const pLower = p.toLowerCase();
      if (p.includes("window.") || p.includes("adslots") || p.includes("renderAd") || p === "Advertisement") {
        return false;
      }
      if (pLower.includes("check your internet connection") || pLower === "translate" || p.length < 12 && p.includes(":") && !p.includes(" ") && p.match(/^\d+(?::\d+)+$/)) {
        return false;
      }
      if (p === "Markets" || p === "Finance" || p === "Economics" || p === "Industries" || p === "Tech" || p === "Politics" || p === "Opinion" || p === "Businessweek" || p === "Live TV" || p === "LiveTV" || p.includes("Latin America Edition") || p === "War With Iran:" || pLower === "select region" || pLower === "current region" || pLower === "subscribe" || pLower === "sign in" || pLower === "search" || pLower === "menu") {
        return false;
      }
      if (p === "Save" || p === "Gift this article" || p.includes("Gift this article") || p === "Share this article" || pLower === "facebook" || pLower === "x" || pLower === "linkedin" || pLower === "email" || pLower === "link" || pLower === "copy link" || pLower === "back" || pLower === "forward") {
        return false;
      }
      if (p.startsWith("Contact us:") || p.includes("Provide news feedback") || p.startsWith("Confidential tip?") || p.includes("Send a tip to our reporters") || p.startsWith("Site feedback:") || pLower.includes("take our survey") || pLower === "take our survey") {
        return false;
      }
      if (p === "Listen" || p.startsWith("Listen (") || pLower === "listen to article") {
        return false;
      }
      return true;
    });
    if (filtered.length === 0) return "";
    let startIndex = 0;
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      const pLower = p.toLowerCase();
      if (p.length < 60 && (p.startsWith("By ") || pLower.includes("updated") || pLower.includes("published") || pLower.includes("feedback") || pLower.includes("survey") || pLower.includes("contact") || pLower.includes("tip?") || pLower.includes("newsletter") || pLower.includes("sign up") || pLower.includes("latest") || pLower.includes("toll system") || // video caption
      p.includes("at ") && p.includes("UTC") || // timestamp
      p.split(" ").length < 8)) {
        continue;
      }
      startIndex = i;
      break;
    }
    let endIndex = filtered.length - 1;
    let foundEnd = -1;
    for (let i = filtered.length - 1; i >= 0; i--) {
      const p = filtered[i];
      if (p.includes("With assistance from") || p.startsWith("(") && p.toLowerCase().includes("updates")) {
        foundEnd = i;
        break;
      }
    }
    if (foundEnd !== -1) {
      endIndex = foundEnd;
    } else {
      for (let i = filtered.length - 1; i >= 0; i--) {
        const p = filtered[i];
        if (p.includes("Copyright \xA9") || p.includes("Bloomberg L.P.") || p.includes("All Rights Reserved") || p.includes("Terms of Service") || p.includes("Privacy Policy") || p.includes("Subscription Plan") || p.includes("To read the full article")) {
          continue;
        }
        if (p.includes("More from Bloomberg") || p.includes("Sign up for") || p.includes("Subscribe for unlimited access")) {
          continue;
        }
        const isAssistanceOrUpdate = p.includes("With assistance from") || p.startsWith("(") && p.toLowerCase().includes("updates");
        if (p.length < 35 && !isAssistanceOrUpdate) {
          continue;
        }
        endIndex = i;
        break;
      }
    }
    if (startIndex > endIndex) {
      return filtered.join("\n\n");
    }
    const sliced = filtered.slice(startIndex, endIndex + 1);
    return sliced.join("\n\n");
  }
  function cleanWSJText(text) {
    const paragraphs = text.split("\n\n").map((p) => p.trim()).filter(Boolean);
    const filtered = paragraphs.filter((p) => {
      if (p.includes("function ()") || p.includes("var adOptions") || p.includes("window.") || p.includes("window.__ace") || p.includes("adslots") || p.includes("adActivate") || p.includes("renderAd") || p.includes("{") && p.includes("}") && (p.includes(":") || p.includes(";"))) {
        return false;
      }
      if (p === "Advertisement") {
        return false;
      }
      return true;
    });
    if (filtered.length === 0) return "";
    let startIndex = 0;
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      if (p === "Listen" || p === "By" || p.match(/^\(\d+\s*min\)$/i)) {
        continue;
      }
      if (p.match(/^[A-Z][a-z]+ \d+, \d{4}$/i) || p.match(/^[A-Z][a-z]+ \d+, \d{4} \d+:\d+ [ap]m ET$/i) || p.match(/^\d+ hours? ago$/i) || p.match(/^\d+ min ago$/i)) {
        continue;
      }
      if (p.includes("Luis Manuel Lopez") || p.match(/\/[A-Za-z\s]+$/) && (p.includes("Reuters") || p.includes("AP") || p.includes("Getty") || p.includes("AFP"))) {
        continue;
      }
      startIndex = i;
      break;
    }
    let endIndex = filtered.length - 1;
    for (let i = filtered.length - 1; i >= 0; i--) {
      const p = filtered[i];
      if (p.includes("Copyright \xA9") || p.includes("All Rights Reserved") || p.includes("Dow Jones & Company")) {
        continue;
      }
      if (p.match(/is a rewrite editor/i) || p.match(/is a reporter/i) || p.includes("rewrite editor at The Wall Street Journal")) {
        continue;
      }
      if (p === "Autos" || p === "Climate and Energy Newsletter" || p === "Latin America News" || p === "Heard on the Street" || p === "Earnings" || p === "Whats News Newsletter" || p === "Videos" || p.includes("Most Popular") || p.includes("OPINION") || p.includes("Recommended Videos") || p.includes("Inside Israel\u2019s High-Tech") || p.includes("Quantum Computing") || p.includes("Opinion:")) {
        continue;
      }
      if (p.length < 40) {
        continue;
      }
      endIndex = i;
      break;
    }
    if (startIndex > endIndex) {
      return filtered.join("\n\n");
    }
    const sliced = filtered.slice(startIndex, endIndex + 1);
    return sliced.filter((p) => {
      const lower = p.toLowerCase();
      if (lower === "quick summary") return false;
      if (lower.includes("generated with ai") && lower.includes("reviewed by an editor")) return false;
      if (lower.includes("read more about how we use artificial intelligence")) return false;
      if (lower === "view more" || lower === "viewmore") return false;
      return true;
    }).map((p) => {
      return p.replace(/[\.\s]*View\s*more\s*$/i, ".").trim();
    }).filter(Boolean).join("\n\n");
  }
  function cleanElUniversalText(text) {
    const paragraphs = text.split("\n\n").map((p) => p.trim()).filter(Boolean);
    const seenTexts = /* @__PURE__ */ new Set();
    const filtered = paragraphs.filter((p) => {
      const lower = p.toLowerCase();
      if (lower === "[publicidad]" || lower === "[ publicidad ]" || lower === "publicidad" || /^\[\s*publicidad\s*\]$/i.test(p)) {
        return false;
      }
      if (lower.includes("\xFAnete a nuestro canal") && lower.includes("whatsapp")) return false;
      if (lower.includes("recibir directo en tu correo") && lower.includes("suscr\xEDbete")) return false;
      if (lower.includes("recibe las noticias m\xE1s relevantes del d\xEDa")) return false;
      if (lower.startsWith("lee tambi\xE9n") || lower.startsWith("lee tambien") || lower.startsWith("leer tambi\xE9n") || lower.startsWith("leer tambien") || lower.startsWith("lee aqu\xED la nota completa") || lower.startsWith("lee aqui la nota completa")) {
        return false;
      }
      if (lower.startsWith("play video") || lower.startsWith("this is a modal window") || lower.startsWith("beginning of dialog window") || lower.startsWith("end of dialog window") || lower.startsWith("video player is loading") || lower.startsWith("current time") || lower.startsWith("duration") || lower.startsWith("loaded:") || lower.startsWith("remaining time") || lower === "siguiente" || lower === "continuar" || lower.startsWith("close \u2715") || lower.startsWith("close") && lower.includes("\u2715") || lower === "adchoices" || lower.includes("adchoices") && p.length < 30) {
        return false;
      }
      if (p.length > 15) {
        if (seenTexts.has(p)) {
          return false;
        }
        seenTexts.add(p);
      }
      return true;
    });
    if (filtered.length === 0) return "";
    let stopIndex = filtered.length;
    for (let i = 0; i < filtered.length; i++) {
      const p = filtered[i];
      const lower = p.toLowerCase();
      if (lower === "lo m\xE1s le\xEDdo" || lower === "lo mas leido" || lower === "temas relacionados" || lower === "m\xE1s informaci\xF3n" || lower === "mas informacion" || lower === "opini\xF3n" || lower === "opinion") {
        stopIndex = i;
        break;
      }
    }
    const mainParagraphs = filtered.slice(0, stopIndex);
    if (mainParagraphs.length === 0) return "";
    let endIndex = mainParagraphs.length - 1;
    for (let i = mainParagraphs.length - 1; i >= 0; i--) {
      const p = mainParagraphs[i];
      const lower = p.toLowerCase();
      if (lower.startsWith("con informaci\xF3n de")) {
        endIndex = i - 1;
        break;
      }
      if (p.length > 25) {
        endIndex = i;
        break;
      }
    }
    if (endIndex < 0) return "";
    return mainParagraphs.slice(0, endIndex + 1).join("\n\n");
  }
  function cleanElPaisText(text) {
    if (!text) return "";
    let cleaned = text.replace(/[a-zA-Z0-9\-\.\/_~%?&=#+:]+"(?:\s+[a-zA-Z\-]+="[^"]*")+\s*\/?>/g, "");
    const lowerText = cleaned.toLowerCase();
    if (lowerText.includes("compartir en whatsapp") || lowerText.includes("copiar enlace")) {
      const copyEnlaceIdx = lowerText.lastIndexOf("copiar enlace");
      if (copyEnlaceIdx !== -1) {
        const candidate = cleaned.slice(copyEnlaceIdx + "copiar enlace".length).trim();
        if (candidate.length > 20) {
          cleaned = candidate;
        }
      }
    }
    const paragraphs = cleaned.split("\n\n").map((p) => p.trim()).filter(Boolean);
    const filtered = [];
    for (const p of paragraphs) {
      let cleanP = p;
      const lowerP = p.toLowerCase();
      if (lowerP.includes("mis comentarios") || lowerP.includes("hazte premium") || lowerP.includes("archivado en")) {
        const idxs = [
          lowerP.indexOf("mis comentarios"),
          lowerP.indexOf("hazte premium"),
          lowerP.indexOf("archivado en")
        ].filter((idx) => idx !== -1);
        if (idxs.length > 0) {
          const cutIdx = Math.min(...idxs);
          cleanP = p.slice(0, cutIdx).trim();
        }
      }
      const lower = cleanP.toLowerCase();
      if (lower.includes("compartir en whatsapp") || lower.includes("compartir en facebook") || lower.includes("compartir en twitter") || lower.includes("copiar enlace") || lower.includes("ir a los comentarios") || lower.includes("a\xF1adir el pa\xEDs") || lower.includes("anadir el pais") || lower.includes("compartir:")) {
        continue;
      }
      if (lower.includes("mis comentarios") || lower.includes("rellena tu nombre") || lower.includes("hazte premium") || lower.includes("completar datos") || lower.includes("ya tengo una suscripci\xF3n") || lower.includes("ya tengo una suscripcion") || lower.includes("archivado en")) {
        continue;
      }
      if (lower.startsWith("m\xE9xico am\xE9rica latinoam\xE9rica") || lower.startsWith("mexico america latinoamerica") || lower.includes("m\xE9xico am\xE9rica latinoam\xE9rica") || lower.includes("mexico america latinoamerica") || lower.includes("sinaloa") && lower.includes("interpol") && (lower.includes("omar garcia harfuch") || lower.includes("omar garc\xEDa harfuch")) && cleanP.length < 200) {
        continue;
      }
      if (cleanP.trim().length > 0) {
        filtered.push(cleanP.trim());
      }
    }
    if (filtered.length === 0) return "";
    return filtered.map((p) => p.replace(/\s{2,}/g, " ")).join("\n\n");
  }
  function cleanReformaText(text) {
    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    return paragraphs.join("\n\n");
  }
  function cleanMilenioText(text, authorName = "", titleText = "") {
    const paragraphs = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
    let startIndex = 0;
    let datelineFound = false;
    for (let i2 = 0; i2 < paragraphs.length; i2++) {
      const p = paragraphs[i2];
      if (p.includes(" / ") && p.match(/\d{2}\.\d{2}\.\d{4}/)) {
        startIndex = i2 + 1;
        datelineFound = true;
        break;
      }
    }
    if (!datelineFound) {
      const titleClean = titleText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
      const authorClean = authorName.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
      const descEl = document.querySelector('meta[name="description"]');
      const descText = descEl ? descEl.getAttribute("content") || "" : "";
      const descClean = descText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
      for (let i2 = 0; i2 < paragraphs.length; i2++) {
        const p = paragraphs[i2];
        const pClean = p.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
        if (!pClean) continue;
        if (titleClean && (pClean === titleClean || pClean.includes(titleClean) || titleClean.includes(pClean))) continue;
        if (descClean && (pClean === descClean || pClean.includes(descClean) || descClean.includes(pClean))) continue;
        if (authorClean && pClean.includes(authorClean)) continue;
        if (pClean.includes("el registro nacional de detenciones detalla que el aseguramiento se realiz")) continue;
        startIndex = i2;
        break;
      }
    }
    let endIndex = paragraphs.length - 1;
    for (let i2 = paragraphs.length - 1; i2 >= startIndex; i2--) {
      const pLower = paragraphs[i2].toLowerCase();
      if (pLower.startsWith("tambi\xE9n puedes leer") || pLower.startsWith("tambien puedes leer") || pLower.startsWith("tambi\xE9n puedes ver") || pLower.startsWith("tambien puedes ver") || pLower.startsWith("tambi\xE9n lee") || pLower.startsWith("tambien lee") || pLower.startsWith("te recomendamos") || pLower.startsWith("sigue leyendo") || pLower.startsWith("lee tambi\xE9n") || pLower.startsWith("lee tambien") || pLower.includes("participa en la ola") || pLower.includes("es real. participa")) {
        endIndex = i2 - 1;
        break;
      }
    }
    for (let i2 = endIndex; i2 >= startIndex; i2--) {
      const p = paragraphs[i2];
      const pLower = p.toLowerCase();
      if (pLower.startsWith("s\xEDguenos en") || pLower.startsWith("siguenos en") || pLower.includes("tags relacionados") || pLower.includes("queda prohibida la reproducci\xF3n") || pLower.includes("propiedad de milenio diario") || pLower.includes("estudi\xF3 ciencias de la comunicaci\xF3n") || pLower.includes("con m\xE1s de 25 a\xF1os de experiencia") || pLower.includes("premio estatal de periodismo") || pLower.includes("amante de los autos cl\xE1sicos") || pLower.includes("para conocer m\xE1s sobre") || pLower.includes("derechos reservados") || pLower.startsWith("tambi\xE9n puedes leer") || pLower.startsWith("tambien puedes leer") || pLower.startsWith("tambi\xE9n puedes ver") || pLower.startsWith("tambien puedes ver") || pLower.startsWith("te recomendamos") || pLower.startsWith("sigue leyendo") || pLower.startsWith("lee tambi\xE9n") || pLower.startsWith("lee tambien") || pLower.includes("participa en la ola") || pLower.includes("es real. participa")) {
        endIndex = i2 - 1;
        continue;
      }
      break;
    }
    if (startIndex > endIndex) return "";
    const storyParagraphs = paragraphs.slice(startIndex, endIndex + 1);
    const filtered = [];
    let i = 0;
    while (i < storyParagraphs.length) {
      const p = storyParagraphs[i];
      const pLower = p.toLowerCase();
      const pClean = p.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "").trim().toLowerCase();
      if (pClean.includes("el registro nacional de detenciones detalla que el aseguramiento se realiz")) {
        i++;
        continue;
      }
      if (pLower.includes("te recomendamos")) {
        i++;
        let skippedCount = 0;
        while (i < storyParagraphs.length && skippedCount < 5) {
          const nextP = storyParagraphs[i];
          if (nextP.length < 250 && !nextP.match(/[.!?]$/)) {
            if (nextP.match(/["']$/) && !nextP.match(/[.!?]["']$/)) {
              i++;
              skippedCount++;
            } else {
              i++;
              skippedCount++;
            }
          } else if (nextP.includes("...")) {
            i++;
            skippedCount++;
          } else {
            break;
          }
        }
        continue;
      }
      filtered.push(p);
      i++;
    }
    return filtered.join("\n\n");
  }
  function extractSiteSpecific(host) {
    const result = { method: "site-specific", confidence: 0 };
    const entry = Object.values(SITE_CONFIGS).find(
      (cfg) => cfg.hostPatterns.some((p) => host.includes(p))
    );
    if (!entry) return result;
    const sel = entry.selectors;
    result.title = querySelectorText(sel.title) || void 0;
    result.author = querySelectorText(sel.author) || void 0;
    result.date = querySelectorText(sel.date) || void 0;
    let contentText = collectText(sel.content) || void 0;
    if (host.includes("wsj.com") && contentText) {
      contentText = cleanWSJText(contentText);
    }
    if (host.includes("bloomberg.com") && contentText) {
      contentText = cleanBloombergText(contentText);
    }
    if (host.includes("eluniversal.com.mx") && contentText) {
      contentText = cleanElUniversalText(contentText);
    }
    if (host.includes("reforma.com") && contentText) {
      contentText = cleanReformaText(contentText);
    }
    if (host.includes("milenio.com") && contentText) {
      contentText = cleanMilenioText(contentText, result.author, result.title);
    }
    if (host.includes("elpais.com") && contentText) {
      contentText = cleanElPaisText(contentText);
    }
    result.content = contentText;
    result.section = sel.section ? querySelectorText(sel.section) : void 0;
    result.subtitle = sel.subtitle ? querySelectorText(sel.subtitle) : void 0;
    if (sel.paywall) {
      const pw = document.querySelector(sel.paywall);
      result.paywallDetected = Boolean(pw);
    } else {
      result.paywallDetected = false;
    }
    result.confidence = result.title || result.content ? 0.85 : 0.4;
    return result;
  }

  // src/extractors/generic.ts
  var NOISE_PATTERNS = /nav|sidebar|footer|header|menu|breadcrumb|comment|social|share|related|widget|promo|advert|ad-|sponsor|newsletter|popup|modal|cookie|consent|signup|login|toolbar|pagination|carousel|gallery-thumbs|trending|most-read|also-read|recomend/i;
  var ARTICLE_CONTAINER_SELECTORS = [
    // Estándar HTML5 semántico
    "article",
    '[role="article"]',
    "main",
    '[role="main"]',
    // Microdata / Schema.org
    '[itemprop="articleBody"]',
    '[itemtype*="schema.org/Article"]',
    '[itemtype*="schema.org/NewsArticle"]',
    // Patrones de CMS comunes (WordPress, Drupal, etc.)
    ".article-body",
    ".article-content",
    ".article__body",
    ".article__content",
    ".story-body",
    ".story-content",
    ".post-body",
    ".post-content",
    ".entry-content",
    ".content-body",
    ".content-article",
    ".field-body",
    ".text-article",
    ".nota-body",
    ".nota-content",
    // Patrones genéricos con data attributes
    '[data-testid*="article"]',
    '[data-testid*="story"]',
    '[data-component="text-block"]',
    // Selectores específicos de PressReader y visor de periódicos
    ".article-text",
    ".article-body-text",
    ".reading-body"
  ];
  var TITLE_SELECTORS = [
    'h1[itemprop="headline"]',
    'h1[data-testid="headline"]',
    'h1[data-testid*="title"]',
    "article h1",
    "main h1",
    '[role="main"] h1',
    ".article-title h1",
    ".article-headline",
    ".story-headline",
    ".headline",
    "h1.title",
    "h1.entry-title",
    "h1.post-title",
    "h1"
  ];
  var AUTHOR_SELECTORS = [
    '[rel="author"]',
    '[itemprop="author"] [itemprop="name"]',
    '[itemprop="author"]',
    '[data-testid="author-name"]',
    '[data-testid*="byline"]',
    '[data-testid*="author"]',
    'a[href*="/author/"]',
    'a[href*="/authors/"]',
    'a[href*="/autor/"]',
    ".author-name",
    ".author",
    ".byline-name",
    ".byline a",
    ".byline",
    ".article-author",
    ".story-author",
    ".post-author",
    ".writer-name",
    ".contributor-name",
    'span[class*="author"]',
    'span[class*="byline"]',
    'p[class*="author"]'
  ];
  var DATE_SELECTORS = [
    "time[datetime]",
    '[itemprop="datePublished"]',
    '[data-testid*="timestamp"]',
    '[data-testid*="date"]',
    ".article-date",
    ".story-date",
    ".publish-date",
    ".published-date",
    ".post-date",
    ".date-published",
    ".article-timestamp",
    ".timestamp",
    'span[class*="date"]'
  ];
  function queryFirst(selectors) {
    for (const sel of selectors) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          let text = (el.textContent || "").trim();
          text = text.replace(/^Article(?=[A-ZÁÉÍÓÚÑÜ“”"'])/, "");
          if (text.length > 0) return text;
        }
      } catch {
      }
    }
    return "";
  }
  function queryDate() {
    const timeEl = document.querySelector("time[datetime]");
    if (timeEl) {
      const dt = timeEl.getAttribute("datetime");
      if (dt) return dt;
      const text = (timeEl.textContent || "").trim();
      if (text) return text;
    }
    const itempropEl = document.querySelector('[itemprop="datePublished"]');
    if (itempropEl) {
      const content = itempropEl.getAttribute("content") || itempropEl.getAttribute("datetime");
      if (content) return content;
      const text = (itempropEl.textContent || "").trim();
      if (text) return text;
    }
    for (const sel of DATE_SELECTORS.slice(2)) {
      try {
        const el = document.querySelector(sel);
        if (el) {
          const text = (el.textContent || "").trim();
          if (text.length > 4) return text;
        }
      } catch {
      }
    }
    return "";
  }
  function cleanDocumentTitle() {
    const raw = document.title || "";
    return raw.replace(/\s*[\|–—:·]\s*[^|–—:·]{2,40}$/g, "").replace(/\s*-\s*[^-]{2,40}$/g, "").trim();
  }
  function isNoiseNode(el) {
    const id = (el.id || "").toLowerCase();
    const cls = (el.className || "").toString().toLowerCase();
    const role = (el.getAttribute("role") || "").toLowerCase();
    if (NOISE_PATTERNS.test(id) || NOISE_PATTERNS.test(cls)) return true;
    if (["navigation", "banner", "complementary", "contentinfo"].includes(role)) return true;
    const tag = el.tagName.toLowerCase();
    if (["nav", "footer", "aside", "header"].includes(tag)) return true;
    return false;
  }
  function scoreContainer(el) {
    if (isNoiseNode(el)) return -100;
    const text = (el.textContent || "").trim();
    const textLength = text.length;
    if (textLength < 100) return -50;
    const paragraphs = el.querySelectorAll("p");
    const pCount = paragraphs.length;
    const links = el.querySelectorAll("a");
    const linkDensity = links.length / Math.max(pCount, 1);
    const htmlLength = el.innerHTML.length;
    const textRatio = htmlLength > 0 ? textLength / htmlLength : 0;
    let score = Math.log(textLength) * 10;
    score += pCount * 3;
    score += textRatio * 30;
    if (linkDensity > 3) score -= 20;
    if (linkDensity > 6) score -= 30;
    if (el.querySelector("time[datetime]")) score += 5;
    if (el.querySelector("[itemprop]")) score += 5;
    const tag = el.tagName.toLowerCase();
    if (tag === "article") score += 25;
    if (tag === "main") score += 15;
    const cls = (el.className || "").toString().toLowerCase();
    if (/article|story|content|body|post|entry|nota/.test(cls)) score += 15;
    return score;
  }
  function findBestContainer() {
    const candidates = [];
    for (const sel of ARTICLE_CONTAINER_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of Array.from(els)) {
          const score = scoreContainer(el);
          if (score > 0) {
            candidates.push({ element: el, score });
          }
        }
      } catch {
      }
    }
    if (candidates.length === 0) {
      const divs = document.querySelectorAll("div, section");
      for (const div of Array.from(divs)) {
        const depth = getDepth(div);
        if (depth < 2 || depth > 8) continue;
        const score = scoreContainer(div);
        if (score > 20) {
          candidates.push({ element: div, score });
        }
      }
    }
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].element;
  }
  function getDepth(el) {
    let depth = 0;
    let current = el;
    while (current && current !== document.documentElement) {
      depth++;
      current = current.parentElement;
    }
    return depth;
  }
  function extractCleanText(container) {
    const blocks = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node2) => {
          const el = node2;
          if (isNoiseNode(el)) return NodeFilter.FILTER_REJECT;
          const tag = el.tagName.toLowerCase();
          if (["p", "h2", "h3", "h4", "h5", "h6", "li", "blockquote", "figcaption"].includes(tag)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          if (tag === "div" && !el.querySelector("p")) {
            const text = (el.textContent || "").trim();
            if (text.length > 50) return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );
    let node;
    while (node = walker.nextNode()) {
      const el = node;
      const text = (el.textContent || "").trim();
      if (text.length > 0) {
        if (!blocks.includes(text)) {
          blocks.push(text);
        }
      }
    }
    return blocks.join("\n\n");
  }
  function extractGeneric() {
    const result = { method: "generic", confidence: 0 };
    result.title = queryFirst(TITLE_SELECTORS) || cleanDocumentTitle() || void 0;
    result.author = queryFirst(AUTHOR_SELECTORS) || void 0;
    result.date = queryDate() || void 0;
    const container = findBestContainer();
    if (container) {
      const cloned = container.cloneNode(true);
      const elementsToRemove = cloned.querySelectorAll("script, style, noscript, iframe, svg, canvas, button, select, option");
      elementsToRemove.forEach((el) => el.remove());
      let text = extractCleanText(cloned);
      if (window.location.hostname.includes("wsj.com") && text) {
        text = cleanWSJText(text);
      }
      if (window.location.hostname.includes("bloomberg.com") && text) {
        text = cleanBloombergText(text);
      }
      if (text.length > 80) {
        result.content = text;
      }
    }
    const paywallHints = document.querySelectorAll(
      '.paywall, .premium-wall, .subscription-wall, [class*="paywall"], [id*="paywall"], [data-testid*="paywall"], .regwall, [class*="barrier"], [class*="metered"]'
    );
    result.paywallDetected = paywallHints.length > 0;
    if (result.title && result.content && result.content.length > 300) {
      result.confidence = 0.6;
    } else if (result.title && result.content) {
      result.confidence = 0.45;
    } else if (result.title) {
      result.confidence = 0.3;
    } else {
      result.confidence = 0.1;
    }
    return result;
  }

  // src/extractors/cascade.ts
  function runExtractionCascade() {
    const results = [];
    const json = extractJsonLd();
    if (json.confidence > 0) results.push(json);
    const site = extractSiteSpecific(window.location.hostname);
    if (site.confidence > 0) results.push(site);
    const meta = extractMetaTags();
    if (meta.confidence > 0) results.push(meta);
    const generic = extractGeneric();
    if (generic.confidence > 0) results.push(generic);
    const merged = mergeResults(results);
    if (window.location.hostname.includes("milenio.com") && merged.texto) {
      const title = merged.superabstract || "";
      const author = merged.autor || "";
      merged.texto = cleanMilenioText(merged.texto, author, title);
    }
    if (window.location.hostname.includes("eluniversal.com.mx") && merged.texto) {
      merged.texto = cleanElUniversalText(merged.texto);
    }
    if (window.location.hostname.includes("elpais.com") && merged.texto) {
      merged.texto = cleanElPaisText(merged.texto);
    }
    let overallMethod = "manual";
    let overallConfidence = 0;
    for (const r of results) {
      if (r.confidence > overallConfidence) {
        overallConfidence = r.confidence;
        overallMethod = r.method;
      }
    }
    if (Object.keys(merged).length === 0 || !merged.superabstract && !merged.texto && !merged.url) {
      return { result: {}, method: "manual", confidence: 0 };
    }
    merged.extractionMethod = overallMethod;
    merged.confidence = overallConfidence;
    return { result: merged, method: overallMethod, confidence: overallConfidence };
  }

  // src/utils/uuid.ts
  function generateUUID() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }

  // src/extractors/snapshot.ts
  var import_readability = __toESM(require_readability(), 1);

  // src/extractors/base64Logos.ts
  var BASE64_LOGOS = {
    "reforma.png": "data:image/png;base64,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",
    "wsj.png": "data:image/png;base64,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"
  };

  // src/extractors/snapshot.ts
  async function toBase64DataUri(url) {
    try {
      const resp = await fetch(url);
      if (!resp.ok) return "";
      const contentType = resp.headers.get("content-type") || "";
      if (contentType.includes("text/html")) return "";
      const blob = await resp.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return "";
    }
  }
  async function getCleanSnapshotHTML() {
    const doc = document.cloneNode(true);
    const hostname = window.location.hostname;
    const originalUrl = window.location.href;
    let siteConfig = null;
    for (const [key, config] of Object.entries(SITE_CONFIGS)) {
      if (hostname.includes(key)) {
        siteConfig = config;
        break;
      }
    }
    const generalNoiseSelectors = [
      "script",
      "noscript",
      "iframe",
      "style",
      'link[rel="stylesheet"]',
      ".ads",
      ".advertisement",
      ".ad-box",
      ".banner-ads",
      '[id*="google_ads"]',
      '[class*="ad-slot"]',
      "aside",
      ".sidebar",
      "#sidebar",
      ".widget",
      ".comments",
      "#comments",
      ".comment-box",
      ".comentarios",
      ".social-share",
      ".share-buttons",
      ".social-links",
      ".share-container",
      ".recommended",
      ".related",
      ".relacionados",
      ".relacionadas",
      ".mas-leidas",
      ".las-mas-leidas",
      ".recomendados",
      ".Te-recomendamos",
      ".trending",
      "footer",
      ".footer",
      "header:not(article header):not(main header)",
      ".header:not(article .header):not(main .header)",
      ".floating-header",
      ".nav-menu",
      "nav",
      ".menu",
      ".toolbar",
      ".popup",
      ".modal",
      ".cookie-consent",
      ".hide-for-print",
      '[class*="hide-for-print" i]',
      '[class*="subscribe-cta" i]',
      '[class*="subscribe-promo" i]',
      '[data-testid*="subscribe-promo" i]',
      '[data-qa*="subscribe-promo" i]',
      '[class*="promo-box" i]',
      '[class*="promo-banner" i]',
      '[class*="promo-container" i]',
      '[data-testid*="promo" i]'
    ];
    const elpaisSelectors = [
      ".tv-products",
      ".product-grid",
      '[class*="asus"]',
      ".nav-secondary",
      ".newsletter-box",
      ".modulo-suscripcion",
      ".promo-box",
      ".suscribete-box"
    ];
    const milenioSelectors = [
      ".las-mas-leidas",
      ".recomendados",
      ".Te-recomendamos",
      ".social-media",
      ".tags-container",
      ".banner-container",
      ".sidebar-container"
    ];
    let selectorsToClean = [...generalNoiseSelectors];
    if (hostname.includes("elpais.com")) {
      selectorsToClean = [...selectorsToClean, ...elpaisSelectors];
    } else if (hostname.includes("milenio.com")) {
      selectorsToClean = [...selectorsToClean, ...milenioSelectors];
    }
    for (const selector of selectorsToClean) {
      try {
        const elements = doc.querySelectorAll(selector);
        elements.forEach((el) => el.remove());
      } catch (e) {
        console.warn(`[PortalScrapper] Error removing selector "${selector}":`, e);
      }
    }
    const seenTexts = /* @__PURE__ */ new Set();
    doc.querySelectorAll("p, div, span, b, strong, figcaption, .caption").forEach((el) => {
      const text = el.textContent?.trim();
      if (!text) return;
      const lower = text.toLowerCase();
      if (lower === "[publicidad]" || lower === "[ publicidad ]" || lower === "publicidad" || /^\[\s*publicidad\s*\]$/i.test(text)) {
        el.remove();
        return;
      }
      if (lower.startsWith("play video") || lower.startsWith("this is a modal window") || lower.startsWith("beginning of dialog window") || lower.startsWith("end of dialog window") || lower.startsWith("video player is loading") || lower.startsWith("current time") || lower.startsWith("duration") || lower.startsWith("loaded:") || lower.startsWith("remaining time") || lower === "siguiente" || lower === "continuar" || lower.startsWith("close \u2715") || lower.startsWith("close") && lower.includes("\u2715") || lower === "adchoices" || lower.includes("adchoices") && text.length < 30) {
        el.remove();
        return;
      }
      if ((lower.startsWith("leer tambi\xE9n") || lower.startsWith("leer tambien") || lower.startsWith("lee tambi\xE9n") || lower.startsWith("lee tambien") || lower.startsWith("te recomendamos")) && text.length < 250) {
        el.remove();
        return;
      }
      if ((lower.includes("\xFAnete a nuestro canal") && lower.includes("whatsapp") || lower.includes("recibir directo en tu correo") && lower.includes("suscr\xEDbete") || lower.includes("recibe las noticias m\xE1s relevantes del d\xEDa")) && text.length < 300) {
        el.remove();
        return;
      }
      const tagName = el.tagName.toLowerCase();
      if (text.length > 15 && (tagName === "p" || tagName === "figcaption" || el.classList.contains("caption"))) {
        if (seenTexts.has(text)) {
          el.remove();
        } else {
          seenTexts.add(text);
        }
      }
    });
    let heroImageSrc = "";
    const ogImg = doc.querySelector('meta[property="og:image"]')?.getAttribute("content");
    if (ogImg) {
      heroImageSrc = ogImg;
    } else {
      const twitterImg = doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content");
      if (twitterImg) {
        heroImageSrc = twitterImg;
      } else {
        const images = Array.from(doc.querySelectorAll("article img, main img, img"));
        let maxArea = 0;
        for (const img of images) {
          const src = img.getAttribute("src");
          if (!src || src.startsWith("data:")) continue;
          const width = parseInt(img.getAttribute("width") || "0", 10);
          const height = parseInt(img.getAttribute("height") || "0", 10);
          const area = width * height;
          if (area > maxArea && area > 5e4) {
            maxArea = area;
            heroImageSrc = src;
          }
        }
        if (!heroImageSrc) {
          for (const img of images) {
            const src = img.getAttribute("src");
            if (src && !src.startsWith("data:") && !/icon|logo|avatar|social/i.test(src)) {
              heroImageSrc = src;
              break;
            }
          }
        }
      }
    }
    if (heroImageSrc && !heroImageSrc.startsWith("http")) {
      try {
        heroImageSrc = new URL(heroImageSrc, originalUrl).href;
      } catch {
      }
    }
    let pageAuthor = "";
    if (siteConfig?.selectors?.author) {
      const el = doc.querySelector(siteConfig.selectors.author);
      pageAuthor = el?.textContent?.trim() || "";
    }
    if (!pageAuthor) {
      pageAuthor = doc.querySelector('meta[name="author"]')?.getAttribute("content") || doc.querySelector('meta[property="article:author"]')?.getAttribute("content") || doc.querySelector('[itemprop="author"]')?.textContent?.trim() || "";
    }
    let pageDate = "";
    if (hostname.includes("eluniversal.com.mx")) {
      const category = doc.querySelector(".sc__author--category")?.textContent?.trim() || "";
      const rawDate = doc.querySelector(".sc__author--date")?.textContent?.trim() || "";
      if (category || rawDate) {
        pageDate = `${category} ${rawDate}`.replace(/\s+/g, " ").trim();
      }
    }
    if (!pageDate && siteConfig?.selectors?.date) {
      const el = doc.querySelector(siteConfig.selectors.date);
      pageDate = el?.getAttribute("datetime") || el?.textContent?.trim() || "";
    }
    if (!pageDate) {
      pageDate = doc.querySelector('meta[property="article:published_time"]')?.getAttribute("content") || doc.querySelector("time[datetime]")?.getAttribute("datetime") || doc.querySelector("time")?.textContent?.trim() || "";
    }
    const pageSubtitle = doc.querySelector('meta[name="description"]')?.getAttribute("content") || doc.querySelector('meta[property="og:description"]')?.getAttribute("content") || doc.querySelector(".article-lead")?.textContent?.trim() || doc.querySelector(".article-subtitle")?.textContent?.trim() || "";
    let pageKicker = doc.querySelector(".article-kicker")?.textContent?.trim() || "";
    if (!pageKicker) {
      const kickerFallback = doc.querySelector('[class*="kicker" i]')?.textContent?.trim() || "";
      if (kickerFallback && kickerFallback.length < 60) {
        pageKicker = kickerFallback;
      }
    }
    if (!pageKicker) {
      const seccionFallback = doc.querySelector('[class*="seccion" i]')?.textContent?.trim() || "";
      if (seccionFallback && seccionFallback.length < 60) {
        pageKicker = seccionFallback;
      }
    }
    if (pageKicker) {
      pageKicker = pageKicker.replace(/\s*category\s*$/i, "").trim();
      if (pageKicker.toLowerCase() === "category") pageKicker = "";
    }
    let extractedSection = "";
    if (siteConfig?.selectors?.section) {
      extractedSection = doc.querySelector(siteConfig.selectors.section)?.textContent?.trim() || "";
    }
    if (!extractedSection) {
      extractedSection = doc.querySelector('meta[property="article:section"]')?.getAttribute("content") || doc.querySelector(".article-section")?.textContent?.trim() || "";
    }
    if (!extractedSection) {
      extractedSection = pageKicker;
    }
    if (extractedSection) {
      extractedSection = extractedSection.replace(/\s*category\s*$/i, "").trim();
      if (extractedSection.toLowerCase() === "category") extractedSection = "";
    }
    let reformaReadingTime = "";
    let reformaAuthor = "";
    let reformaDatePlace = "";
    if (hostname.includes("reforma.com")) {
      const allDivsSpans = Array.from(doc.querySelectorAll("div, span, p"));
      for (const el of allDivsSpans) {
        const text = el.textContent?.trim() || "";
        if (/^\d+\s*MIN(\s*\d+\s*SEG)?$/i.test(text)) {
          reformaReadingTime = text.toUpperCase();
          break;
        }
      }
      const authorEl = doc.querySelector('.author, .article-author, .byline, [name="cXenseParse:author"]');
      const authorText = authorEl?.textContent?.trim() || "";
      if (authorText && authorText.length < 150) {
        let cleanAuthor = authorText;
        const rtMatch = cleanAuthor.match(/\d+\s*MIN(\s*\d+\s*SEG)?/i);
        if (rtMatch) {
          cleanAuthor = cleanAuthor.replace(rtMatch[0], "").trim();
        }
        const placeIndex = cleanAuthor.search(/(Cd\.|Chihuahua|Monterrey|México|\()/i);
        if (placeIndex !== -1) {
          cleanAuthor = cleanAuthor.substring(0, placeIndex).trim();
        }
        reformaAuthor = cleanAuthor;
      }
      const dateEl = doc.querySelector(".date, .fecha");
      let dateText = dateEl?.textContent?.trim() || "";
      if (!dateText || dateText.length >= 150 || dateText.includes("MIN") || dateText.includes("Autor")) {
        for (const el of allDivsSpans) {
          const text = el.textContent?.trim() || "";
          if (text.length < 200 && text.includes("hrs") && text.includes(".-")) {
            dateText = text;
            break;
          }
        }
      }
      if (dateText) {
        let cleanDate = dateText;
        const rtMatch = cleanDate.match(/\d+\s*MIN(\s*\d+\s*SEG)?/i);
        if (rtMatch) {
          if (!reformaReadingTime) {
            reformaReadingTime = rtMatch[0].toUpperCase();
          }
          cleanDate = cleanDate.replace(rtMatch[0], "").trim();
        }
        if (reformaAuthor && cleanDate.startsWith(reformaAuthor)) {
          cleanDate = cleanDate.substring(reformaAuthor.length).trim();
        } else if (reformaAuthor) {
          const authorRegex = new RegExp("^" + reformaAuthor.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&"), "i");
          cleanDate = cleanDate.replace(authorRegex, "").trim();
        }
        const startOfDate = cleanDate.search(/(Cd\.|Chihuahua|Monterrey|México|\(|[A-Z][a-z]+\s+\d+\s+mayo)/i);
        if (startOfDate > 0) {
          cleanDate = cleanDate.substring(startOfDate).trim();
        }
        reformaDatePlace = cleanDate;
      }
    }
    const reader = new import_readability.Readability(doc, { keepClasses: true, charThreshold: 400 });
    const parsedArticle = reader.parse();
    if (!parsedArticle) {
      throw new Error("No se pudo extraer el contenido legible del art\xEDculo.");
    }
    if (heroImageSrc) {
      try {
        const bodyDoc = new DOMParser().parseFromString(parsedArticle.content, "text/html");
        const heroUrlClean = heroImageSrc.split("?")[0].split("#")[0];
        const bodyImages = Array.from(bodyDoc.querySelectorAll("img, picture"));
        let removedAny = false;
        for (const img of bodyImages) {
          let src = "";
          if (img.tagName.toLowerCase() === "picture") {
            const innerImg = img.querySelector("img");
            src = innerImg?.getAttribute("src") || innerImg?.getAttribute("data-src") || "";
          } else {
            src = img.getAttribute("src") || img.getAttribute("data-src") || "";
          }
          if (src) {
            try {
              const absSrc = new URL(src, originalUrl).href;
              const absSrcClean = absSrc.split("?")[0].split("#")[0];
              if (absSrcClean === heroUrlClean) {
                const figure = img.closest("figure, .visual__image, .image-container, .image-initial-width");
                if (figure) {
                  figure.remove();
                } else {
                  img.remove();
                }
                removedAny = true;
                break;
              }
            } catch {
            }
          }
        }
        if (removedAny) {
          parsedArticle.content = bodyDoc.body.innerHTML;
        }
      } catch (e) {
        console.warn("[PortalScrapper] Error removing duplicate hero image:", e);
      }
    }
    const title = parsedArticle.title || doc.title || "Sin t\xEDtulo";
    let authorVal = pageAuthor || parsedArticle.byline;
    if (authorVal && /^(naci[oó]n|nation)$/i.test(authorVal.trim())) {
      authorVal = "";
    }
    const sourceName = parsedArticle.siteName || hostname.replace("www.", "");
    const subtitleVal = parsedArticle.excerpt || pageSubtitle;
    const kickerVal = pageKicker;
    let formattedDate = pageDate;
    if (pageDate) {
      try {
        const parsedDate = new Date(pageDate);
        if (!isNaN(parsedDate.getTime())) {
          formattedDate = parsedDate.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        }
      } catch {
      }
    }
    let metaBlockHtml = "";
    if (hostname.includes("reforma.com")) {
      const readingTime = reformaReadingTime || "02 MIN 30 SEG";
      const author = reformaAuthor || authorVal;
      const datePlace = reformaDatePlace || formattedDate || "Cd. de M\xE9xico";
      metaBlockHtml = `
      <div class="reforma-meta">
        ${readingTime ? `<div class="reforma-meta-reading">${readingTime}</div>` : ""}
        ${author ? `<div class="reforma-meta-author">${author}</div>` : ""}
        ${datePlace ? `<div class="reforma-meta-date">${datePlace}</div>` : ""}
        <div class="reforma-social">
          <span class="social-icon fb"></span>
          <span class="social-icon tw"></span>
          <span class="social-icon wa"></span>
          <span class="social-icon mail"></span>
          <span class="social-icon link"></span>
        </div>
      </div>
    `;
    } else {
      const authorHtml = authorVal ? `
      <div class="meta-item">
        <span class="meta-icon">\u270D\uFE0F</span>
        <span>Autor:</span>
        <strong>${authorVal}</strong>
      </div>
    ` : "";
      const dateHtml = formattedDate ? `
      <div class="meta-item">
        <span class="meta-icon">\u{1F4C5}</span>
        <span>Publicado:</span>
        <strong>${formattedDate}</strong>
      </div>
    ` : "";
      metaBlockHtml = `
      <div class="article-meta">
        ${authorHtml}
        ${dateHtml}
      </div>
    `;
    }
    const heroImageHtml = heroImageSrc ? `
    <div class="hero-container">
      <img src="${heroImageSrc}" alt="${title}" class="hero-image" />
    </div>
  ` : "";
    const navLinks = [];
    try {
      const liveNav = document.querySelector('nav, .nav, .menu, [class*="menu"], [class*="nav"]');
      if (liveNav) {
        const anchors = Array.from(liveNav.querySelectorAll("a"));
        for (const a of anchors) {
          const text = a.textContent?.trim();
          if (text && text.length > 2 && text.length < 15 && !/iniciar|sesion|login|buscar|search|susc|reg/i.test(text)) {
            navLinks.push(text.toUpperCase());
            if (navLinks.length >= 8) break;
          }
        }
      }
    } catch {
    }
    let themeColor = "#0f172a";
    let isDarkTheme = true;
    if (siteConfig?.brandColor) {
      themeColor = siteConfig.brandColor;
    } else {
      const metaTheme = doc.querySelector('meta[name="theme-color"]')?.getAttribute("content");
      if (metaTheme && metaTheme.startsWith("#")) {
        themeColor = metaTheme;
      } else {
        try {
          const liveHeader = document.querySelector("header, .header, #header, nav");
          if (liveHeader) {
            const bgColor = window.getComputedStyle(liveHeader).backgroundColor;
            if (bgColor && bgColor !== "rgba(0, 0, 0, 0)" && bgColor !== "transparent") {
              const match = bgColor.match(/\d+/g);
              if (match && match.length >= 3) {
                const r = parseInt(match[0], 10);
                const g = parseInt(match[1], 10);
                const b = parseInt(match[2], 10);
                themeColor = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
              }
            }
          }
        } catch {
        }
      }
    }
    try {
      const hex = themeColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const luminance = (r * 299 + g * 587 + b * 114) / 1e3;
      isDarkTheme = luminance < 140;
    } catch {
      isDarkTheme = true;
    }
    let logoHtml = "";
    let extractedFontFaceCSS = "";
    if (siteConfig?.logoAsset) {
      const filename = siteConfig.logoAsset.split("/").pop() || "";
      let logoSrc = BASE64_LOGOS[filename] || "";
      if (!logoSrc) {
        try {
          logoSrc = chrome.runtime.getURL(siteConfig.logoAsset);
        } catch (e) {
          console.warn("[PortalScrapper] Error resolving logo asset URL:", e);
        }
      }
      if (logoSrc) {
        logoHtml = `<img src="${logoSrc}" class="extracted-img-logo" style="height: 36px; max-height: 40px;" alt="${siteConfig.name}">`;
      } else {
        logoHtml = siteConfig.logoHtml || "";
      }
    } else if (siteConfig?.logoHtml) {
      logoHtml = siteConfig.logoHtml;
    } else {
      let foundLogo = null;
      let foundTextLogo = null;
      try {
        const specificLogoSelectors = [
          'a[class*="site-logo" i] img',
          'a[class*="site-logo" i] svg',
          'a[class*="main-logo" i] img',
          'a[class*="main-logo" i] svg',
          '[class*="site-logo" i] img',
          '[class*="site-logo" i] svg',
          'img[class*="site-logo" i]',
          'svg[class*="site-logo" i]',
          'img[class*="main-logo" i]',
          'svg[class*="main-logo" i]',
          "#logo img",
          "#logo svg",
          ".logo img",
          ".logo svg",
          'a[class*="brand" i] img',
          'a[class*="brand" i] svg',
          'img[src*="logo_infobae" i]'
        ];
        for (const sel of specificLogoSelectors) {
          foundLogo = document.querySelector(sel);
          if (foundLogo) break;
        }
        if (!foundLogo) {
          const homeLinks = Array.from(document.querySelectorAll('a[href="/"], a[href="./"], a[href="' + window.location.origin + '/"], a[href="' + window.location.origin + '"]'));
          for (const link of homeLinks) {
            const classStr = link.className || "";
            const ariaLabel = link.getAttribute("aria-label") || "";
            const idStr = link.id || "";
            const hasDescendantLogoAttr = !!link.querySelector('[class*="logo" i], [id*="logo" i], [data-testid*="logo" i], [data-qa*="logo" i], [aria-label*="logo" i], [label*="logo" i], [alt*="logo" i], [aria-label*="homepage" i]');
            const isProbablyLogoLink = /logo|brand|home/i.test(classStr) || /logo|home|brand/i.test(ariaLabel) || /logo|brand/i.test(idStr) || hasDescendantLogoAttr;
            if (isProbablyLogoLink) {
              const svg2 = link.querySelector("svg");
              if (svg2) {
                foundLogo = svg2;
                break;
              }
              const img2 = link.querySelector("img");
              if (img2) {
                foundLogo = img2;
                break;
              }
            }
            const img = link.querySelector('img[src*="logo" i], img[src*="brand" i], img[class*="logo" i], img[alt*="logo" i], img[alt*="brand" i]');
            if (img) {
              foundLogo = img;
              break;
            }
            const svg = link.querySelector('svg[class*="logo" i], svg[id*="logo" i]');
            if (svg) {
              foundLogo = svg;
              break;
            }
          }
        }
        if (!foundLogo) {
          const liveHeader = document.querySelector('header, .header, #header, nav, .nav, .sectionnav-container, [class*="header" i], [class*="nav" i]');
          if (liveHeader) {
            foundLogo = liveHeader.querySelector('img[src*="logo" i], img[src*="brand" i], img[class*="logo" i], svg[class*="logo" i], svg[id*="logo" i]');
            if (!foundLogo) {
              foundTextLogo = liveHeader.querySelector('a[aria-label*="logo" i], a[class*="BrandLogo" i], a[class*="LogoBase" i], [class*="BrandLogo" i]');
            }
          }
        }
        if (!foundLogo && !foundTextLogo) {
          const looseImgs = Array.from(document.querySelectorAll('img[src*="logo" i], img[class*="logo" i], img[alt*="logo" i]'));
          for (const img of looseImgs) {
            const src = img.getAttribute("src") || "";
            const alt = img.getAttribute("alt") || "";
            if (!/facebook|twitter|linkedin|whatsapp|instagram|youtube|social/i.test(src) && !/facebook|twitter|linkedin|whatsapp|instagram|youtube|social/i.test(alt)) {
              foundLogo = img;
              break;
            }
          }
        }
      } catch (e) {
        console.warn("[PortalScrapper] Error in generic logo resolution cascade:", e);
      }
      if (foundLogo) {
        try {
          const clonedLogo = foundLogo.cloneNode(true);
          clonedLogo.removeAttribute("style");
          if (clonedLogo.tagName.toLowerCase() === "svg") {
            clonedLogo.setAttribute("height", "32");
            clonedLogo.removeAttribute("width");
            clonedLogo.classList.add("extracted-svg-logo");
            if (isDarkTheme) {
              clonedLogo.setAttribute("fill", "#ffffff");
              clonedLogo.querySelectorAll("*").forEach((child) => {
                if (child.getAttribute("fill") && child.getAttribute("fill") !== "none") {
                  child.setAttribute("fill", "#ffffff");
                }
                if (child.getAttribute("stroke") && child.getAttribute("stroke") !== "none") {
                  child.setAttribute("stroke", "#ffffff");
                }
              });
            }
          } else {
            clonedLogo.setAttribute("height", "32");
            clonedLogo.removeAttribute("width");
            clonedLogo.classList.add("extracted-img-logo");
            let src = foundLogo.src || clonedLogo.getAttribute("src") || "";
            if (src && !src.startsWith("http") && !src.startsWith("data:")) {
              try {
                src = new URL(src, originalUrl).href;
              } catch {
              }
            }
            if (src && src.startsWith("http")) {
              try {
                const base64 = await toBase64DataUri(src);
                if (base64) {
                  clonedLogo.setAttribute("src", base64);
                } else {
                  clonedLogo.setAttribute("src", src);
                }
              } catch {
                clonedLogo.setAttribute("src", src);
              }
            }
          }
          logoHtml = clonedLogo.outerHTML;
        } catch {
          const nameCleaned = hostname.replace("www.", "").split(".")[0].toUpperCase();
          logoHtml = `<div class="brand-text-logo generic-font">${nameCleaned}</div>`;
        }
      } else if (foundTextLogo) {
        const logoText = foundTextLogo.textContent?.trim();
        if (logoText && logoText.length > 2 && logoText.length < 80) {
          try {
            const computed = window.getComputedStyle(foundTextLogo);
            const fontFamily = computed.fontFamily;
            const fontSize = computed.fontSize;
            const fontWeight = computed.fontWeight;
            const letterSpacing = computed.letterSpacing;
            const textTransform = computed.textTransform;
            const color = isDarkTheme ? "#ffffff" : "#0f172a";
            const fontFamilyPrimary = fontFamily.split(",")[0].replace(/['"]/g, "").trim();
            try {
              for (const sheet of Array.from(document.styleSheets)) {
                try {
                  for (const rule of Array.from(sheet.cssRules)) {
                    if (rule instanceof CSSFontFaceRule) {
                      const ruleFontFamily = rule.style.getPropertyValue("font-family").replace(/['"]/g, "").trim();
                      if (ruleFontFamily === fontFamilyPrimary || fontFamilyPrimary.includes(ruleFontFamily)) {
                        extractedFontFaceCSS += rule.cssText + "\n";
                      }
                    }
                  }
                } catch {
                }
              }
            } catch {
            }
            if (!extractedFontFaceCSS) {
              try {
                const linkEls = document.querySelectorAll('link[rel="stylesheet"]');
                for (const link of Array.from(linkEls)) {
                  const href = link.getAttribute("href");
                  if (!href) continue;
                  try {
                    const sheetUrl = new URL(href, window.location.origin).href;
                    const resp = await fetch(sheetUrl, { credentials: "omit" });
                    if (!resp.ok) continue;
                    const cssText = await resp.text();
                    const fontFaceRegex = /@font-face\s*\{[\s\S]*?\}/gi;
                    const matches = cssText.match(fontFaceRegex);
                    if (matches) {
                      for (const block of matches) {
                        const familyMatch = block.match(/font-family\s*:\s*['"]?([^'";]+)/i);
                        if (familyMatch) {
                          const declaredFamily = familyMatch[1].trim();
                          if (declaredFamily === fontFamilyPrimary || fontFamilyPrimary.includes(declaredFamily)) {
                            const resolvedBlock = block.replace(/url\((['"]?)([^)'"]+)\1\)/gi, (_full, quote, relUrl) => {
                              try {
                                const absUrl = new URL(relUrl, sheetUrl).href;
                                return `url(${quote}${absUrl}${quote})`;
                              } catch {
                                return _full;
                              }
                            });
                            extractedFontFaceCSS += resolvedBlock + "\n";
                          }
                        }
                      }
                    }
                    if (extractedFontFaceCSS) break;
                  } catch {
                  }
                }
              } catch {
              }
            }
            const fallbackFontFamily = `${fontFamily}, 'Playfair Display', 'Times New Roman', serif`;
            logoHtml = `<div class="brand-text-logo extracted-text-logo" style="font-family: ${fallbackFontFamily}; font-size: ${fontSize}; font-weight: ${fontWeight}; letter-spacing: ${letterSpacing}; text-transform: ${textTransform}; color: ${color};">${logoText}</div>`;
          } catch {
            logoHtml = `<div class="brand-text-logo generic-font">${logoText}</div>`;
          }
        } else {
          const nameCleaned = hostname.replace("www.", "").split(".")[0].toUpperCase();
          logoHtml = `<div class="brand-text-logo generic-font">${nameCleaned}</div>`;
        }
      } else {
        const nameCleaned = hostname.replace("www.", "").split(".")[0].toUpperCase();
        logoHtml = `<div class="brand-text-logo generic-font">${nameCleaned}</div>`;
      }
    }
    let sectionName = extractedSection || "";
    const kickerHtml = kickerVal && kickerVal.toUpperCase() !== sectionName.toUpperCase() ? `
    <div class="article-kicker">${kickerVal}</div>
  ` : "";
    const subtitleHtml = subtitleVal ? `
    <div class="article-subtitle">${subtitleVal}</div>
  ` : "";
    const navLinksText = navLinks.length > 0 ? navLinks.join(" \u2022 ") : "NACIONAL \u2022 INTERNACIONAL \u2022 OPINI\xD3N \u2022 ECONOM\xCDA \u2022 CIENCIA \u2022 TENDENCIAS \u2022 CULTURA";
    const resolvedBgColor = siteConfig?.contentBgColor || "#ffffff";
    const resolvedBodyFont = siteConfig?.bodyFontFamily || "'Lora', Georgia, serif";
    const resolvedTitleFont = siteConfig?.titleFontFamily || "'Playfair Display', 'Times New Roman', serif";
    const cleanSubtitle = (subtitleVal || "").replace(/"/g, "&quot;").replace(/[\r\n]+/g, " ").trim();
    const jsonLdAuthor = (authorVal || "").replace(/"/g, '\\"').trim() || "Redacci\xF3n";
    const jsonLdTitle = title.replace(/"/g, '\\"');
    const jsonLdPublisher = sourceName.replace(/"/g, '\\"');
    const jsonLdImage = heroImageSrc ? `"${heroImageSrc}"` : "[]";
    const finalHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <base href="${originalUrl}">

  <!-- SEO & Dynamic Previews (WhatsApp, Telegram, Facebook, Twitter, Slack, Discord) -->
  <meta name="description" content="${cleanSubtitle}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${cleanSubtitle}">
  ${heroImageSrc ? `<meta property="og:image" content="${heroImageSrc}">` : ""}
  <meta property="og:url" content="${originalUrl}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="${sourceName}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${cleanSubtitle}">
  ${heroImageSrc ? `<meta name="twitter:image" content="${heroImageSrc}">` : ""}

  <!-- Premium color accent for link preview sidebars (Telegram, Discord, Slack) -->
  <meta name="theme-color" content="${themeColor}">

  <!-- Schema.org Structured Metadata for Crawlers & Previews -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    "headline": "${jsonLdTitle}",
    "image": ${jsonLdImage.startsWith('"') ? `[${jsonLdImage}]` : "[]"},
    "datePublished": "${pageDate || (/* @__PURE__ */ new Date()).toISOString()}",
    "author": [{
      "@type": "Person",
      "name": "${jsonLdAuthor}"
    }],
    "publisher": {
      "@type": "Organization",
      "name": "${jsonLdPublisher}"
    }
  }
  <\/script>

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&family=Libre+Bodoni:wght@400;700&display=swap" rel="stylesheet">
  <style>
    /* Extracted @font-face rules from source page */
    ${extractedFontFaceCSS}

    :root {
      --primary-color: #0f172a;
      --text-color: #1e293b;
      --bg-color: ${resolvedBgColor};
      --border-color: #e2e8f0;
      --meta-color: #64748b;
      --accent-color: #e11d48;
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: ${resolvedBodyFont};
      color: var(--text-color);
      background-color: var(--bg-color);
      line-height: 1.65;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    /* Floating Action Bar */
    .action-bar {
      position: sticky;
      top: 0;
      background: rgba(255, 255, 255, 0.9);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border-color);
      padding: 14px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
    }

    .action-bar .brand {
      font-family: 'Inter', sans-serif;
      font-weight: 600;
      font-size: 14px;
      color: var(--primary-color);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .action-bar .buttons {
      display: flex;
      gap: 12px;
    }

    .btn {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 13px;
      padding: 8px 16px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background-color: #ffffff;
      color: #334155;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s ease;
      outline: none;
    }

    .btn:hover {
      background-color: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
    }

    .btn-primary {
      background-color: #0f172a;
      color: #ffffff;
      border-color: #0f172a;
    }

    .btn-primary:hover {
      background-color: #1e293b;
      border-color: #1e293b;
      color: #ffffff;
    }

    /* Masthead Layout */
    .portal-top-bar {
      background-color: ${themeColor};
      color: ${isDarkTheme ? "#ffffff" : "#0f172a"};
      padding: 14px 24px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      min-height: 58px;
      border-bottom: ${isDarkTheme ? "none" : "1px solid #e2e8f0"};
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    .brand-text-logo {
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-size: 28px;
      line-height: 1;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .brand-text-logo.elpais-font {
      font-family: 'Playfair Display', serif;
      font-size: 32px;
      letter-spacing: 0.08em;
      color: #ffffff;
    }

    .brand-text-logo.milenio-font {
      font-family: 'Playfair Display', 'Times New Roman', serif;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #ffffff;
    }

    .brand-text-logo.generic-font {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
    }

    .brand-text-logo .registered {
      font-size: 14px;
      vertical-align: super;
      margin-left: 2px;
      font-weight: normal;
    }

    .extracted-svg-logo {
      max-height: 32px;
      width: auto;
      display: block;
    }

    .extracted-img-logo {
      max-height: 40px;
      width: auto;
      object-fit: contain;
      display: block;
    }

    .extracted-text-logo {
      line-height: 1;
      white-space: nowrap;
      text-decoration: none;
    }

    .portal-masthead {
      margin-bottom: 24px;
      text-align: center;
      width: 100%;
    }

    .portal-section-bar {
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color);
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .portal-section-title {
      font-family: 'Inter', sans-serif;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--meta-color);
      line-height: 1;
      margin: 0;
      z-index: 10;
    }

    .portal-nav {
      display: none !important;
    }

    /* Content Container */
    .container {
      max-width: 740px;
      margin: 40px auto;
      padding: 0 24px;
    }

    /* Header styling */
    .article-header {
      margin-bottom: 24px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 20px;
    }

    .article-kicker {
      font-family: 'Inter', sans-serif;
      font-weight: 500;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: #64748b;
      margin-bottom: 14px;
      text-align: center;
    }

    .article-title {
      font-family: ${resolvedTitleFont};
      font-size: 30px;
      line-height: 1.25;
      font-weight: 700;
      color: var(--primary-color);
      margin: 0 0 16px 0;
      text-align: left;
    }

    .article-subtitle {
      font-family: ${resolvedBodyFont};
      font-size: 16px;
      line-height: 1.45;
      color: #475569;
      margin: 0 0 18px 0;
      font-weight: 400;
      text-align: left;
    }

    .article-meta {
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      color: var(--meta-color);
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: center;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .meta-icon {
      font-size: 14px;
    }

    /* Reforma Specific Meta Styling */
    .reforma-meta {
      font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
      margin-top: 12px;
      text-align: left;
    }

    .reforma-meta-reading {
      font-size: 11px;
      font-weight: 500;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }

    .reforma-meta-author {
      font-size: 13px;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .reforma-meta-date {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 14px;
    }

    /* Circular Social Share Buttons matching Reforma */
    .reforma-social {
      display: flex;
      gap: 10px;
      margin-top: 12px;
      margin-bottom: 8px;
    }

    .reforma-social .social-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background-color: #1e293b; /* dark blue/black circular background */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    }

    /* Draw simple SVG or CSS representations of social icons to match Reforma screenshot */
    .reforma-social .social-icon::before {
      content: '';
      display: block;
      width: 14px;
      height: 14px;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      filter: invert(1); /* make icons white */
    }

    .reforma-social .social-icon.fb::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M9 8H7v3h2v9h3v-9h3l.5-3H12V6c0-.88.39-1 1-1h2V2h-3c-2.9 0-5 1.55-5 4.5V8z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.tw::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.wa::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.73-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.59 1.98 14.124.954 11.5.952c-5.437 0-9.862 4.371-9.866 9.8 0 2.015.533 3.984 1.543 5.739l-.482 1.761 1.802-.472z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.mail::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z'/%3E%3C/svg%3E");
    }

    .reforma-social .social-icon.link::before {
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z'/%3E%3C/svg%3E");
    }

    /* Hero Image */
    .hero-container {
      max-width: 600px;
      margin: 0 auto 36px auto;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
    }

    .hero-image {
      width: 100%;
      height: auto;
      display: block;
      object-fit: cover;
      max-height: 480px;
    }

    .article-body {
      font-size: 16px;
      color: #1e293b;
    }

    .article-body p {
      margin: 0 0 22px 0;
    }

    .article-body h1, .article-body h2, .article-body h3, .article-body h4 {
      font-family: 'Playfair Display', serif;
      color: var(--primary-color);
      margin: 36px 0 18px 0;
      line-height: 1.3;
    }

    .article-body h2 {
      font-size: 26px;
    }

    .article-body h3 {
      font-size: 22px;
    }

    .article-body blockquote {
      border-left: 4px solid var(--accent-color);
      padding-left: 20px;
      margin: 28px 0;
      font-style: italic;
      color: #475569;
      background-color: #f8fafc;
      padding-top: 8px;
      padding-bottom: 8px;
      border-radius: 0 4px 4px 0;
    }

    .article-body img,
    .article-body [data-type="inset"],
    .article-body .media-layout,
    .article-body iframe,
    .article-body .origami-wrapper {
      max-width: 580px;
      height: auto;
      border-radius: 6px;
      margin: 28px auto;
      display: block;
    }

    .article-body ul, .article-body ol {
      margin: 0 0 22px 0;
      padding-left: 24px;
    }

    .article-body li {
      margin-bottom: 8px;
    }

    .original-url-footer {
      margin-top: 60px;
      border-top: 1px solid var(--border-color);
      padding-top: 24px;
      font-family: 'Inter', sans-serif;
      font-size: 12px;
      color: var(--meta-color);
      word-break: break-all;
      text-align: center;
      line-height: 1.5;
    }

    .original-url-footer a {
      color: var(--primary-color);
      text-decoration: underline;
    }

    /* Print Specific Stylesheet */
    @media print {
      body {
        font-size: 12pt;
        color: #000;
        background: #fff;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .action-bar {
        display: none !important;
      }
      .portal-top-bar {
        background-color: ${themeColor} !important;
        color: ${isDarkTheme ? "#ffffff" : "#0f172a"} !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        display: flex !important;
      }
      .container {
        max-width: 100%;
        margin: 0;
        padding: 0;
      }
      .article-title {
        font-size: 26pt;
      }
      .article-body {
        font-size: 11pt;
      }
      .hero-image {
        max-height: 380px;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div class="brand">
      <span>\u{1F4F0} PortalScrapper Snapshot</span>
    </div>
    <div class="buttons">
      <button class="btn" id="btn-snapshot-close">\u274C Cerrar</button>
      <button class="btn" id="btn-snapshot-save">\u{1F4BE} Guardar HTML</button>
      <button class="btn btn-primary" id="btn-snapshot-print">\u{1F5A8}\uFE0F Imprimir</button>
    </div>
  </div>

  <div class="portal-top-bar">
    ${logoHtml}
  </div>

  <div class="container">
    <div class="portal-masthead">
      ${sectionName ? `
      <div class="portal-section-bar">
        <h2 class="portal-section-title">${sectionName}</h2>
        <div class="portal-nav">${navLinksText}</div>
      </div>
      ` : ""}
      ${kickerHtml}
    </div>

    <div class="article-header">
      <h1 class="article-title">${title}</h1>
      ${subtitleHtml}
      ${metaBlockHtml}
    </div>

    ${heroImageHtml}

    <div class="article-body">
      ${parsedArticle.content}
    </div>

    <div class="original-url-footer">
      Documento generado por PortalScrapper.<br>
      Nota original: <a href="${originalUrl}" target="_blank">${originalUrl}</a>
    </div>
  </div>
</body>
</html>`;
    return {
      html: finalHtml,
      title,
      originalUrl
    };
  }

  // src/content/index.ts
  function getHostname() {
    return window.location.hostname.replace("www.", "");
  }
  function detectSite() {
    const host = getHostname();
    const known = {
      "wsj.com": "Wall Street Journal",
      "nytimes.com": "New York Times",
      "reuters.com": "Reuters",
      "ft.com": "Financial Times",
      "pressreader.com": "PressReader",
      "bloomberg.com": "Bloomberg",
      "washingtonpost.com": "Washington Post",
      "elpais.com": "El Pa\xEDs",
      "reforma.com": "Reforma",
      "milenio.com": "Milenio",
      "eluniversal.com.mx": "El Universal"
    };
    for (const [key, val] of Object.entries(known)) {
      if (host.includes(key)) return { site: key, name: val };
    }
    const pathname = window.location.pathname;
    if (pathname.length > 1) {
      const displayName = host.replace(/^(www|m|mobile|amp)\./, "").split(".")[0].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return { site: host, name: `${displayName} (gen\xE9rico)` };
    }
    return null;
  }
  function getCleanUrl() {
    try {
      const canonicalEl = document.querySelector('link[rel="canonical"]');
      if (canonicalEl) {
        const href = canonicalEl.getAttribute("href");
        if (href) {
          const absoluteUrl = new URL(href, window.location.href).href;
          if (absoluteUrl.startsWith("http://") || absoluteUrl.startsWith("https://")) {
            return absoluteUrl;
          }
        }
      }
    } catch (e) {
      console.warn("[PortalScrapper] Error resolving canonical URL:", e);
    }
    try {
      const ogUrlEl = document.querySelector('meta[property="og:url"]');
      if (ogUrlEl) {
        const content = ogUrlEl.getAttribute("content");
        if (content) {
          const absoluteUrl = new URL(content, window.location.href).href;
          if (absoluteUrl.startsWith("http://") || absoluteUrl.startsWith("https://")) {
            return absoluteUrl;
          }
        }
      }
    } catch (e) {
      console.warn("[PortalScrapper] Error resolving OG URL:", e);
    }
    try {
      const url = new URL(window.location.href);
      const trackers = [
        "mod",
        "pos",
        "page",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_term",
        "utm_content",
        "ref",
        "ref_",
        "fbclid",
        "gclid",
        "yclid",
        "pos",
        "pos_"
      ];
      trackers.forEach((t) => url.searchParams.delete(t));
      return url.toString();
    } catch {
      return window.location.href;
    }
  }
  function buildArticleFromExtraction(extracted) {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const host = getHostname();
    const cleanUrl = getCleanUrl();
    return {
      id: generateUUID(),
      source: host,
      url: cleanUrl,
      urlWithParams: window.location.href,
      emisora: 0,
      emision: 4659889,
      evento: 1,
      pendiente: 1,
      fecha: extracted.fecha || now,
      superabstract: extracted.superabstract || extracted.title || document.title || "Sin t\xEDtulo",
      autor: extracted.autor || "",
      medio: extracted.medio || detectSite()?.name || host,
      abstract: cleanUrl,
      texto: extracted.texto || extracted.content || "",
      subtitulo: extracted.subtitulo || "",
      seccion: extracted.seccion || "",
      clasificaciones: [],
      notas: "",
      isFullContent: extracted.isFullContent ?? (extracted.texto || "").length > 200,
      paywallDetected: extracted.paywallDetected ?? false,
      extractionMethod: extracted.extractionMethod || "manual",
      confidence: extracted.confidence || 0.5,
      capturedAt: now,
      lastModified: now,
      status: "draft"
    };
  }
  var extractionLocked = false;
  var lastExtractedText = "";
  async function handleExtractionRequest(source = "explicit", isManualRefresh = false) {
    if (source === "observer" && extractionLocked) {
      console.log("[PortalScrapper] Extraction locked. Skipping passive re-extraction.");
      return;
    }
    const { result, method, confidence } = runExtractionCascade();
    const partial = buildArticleFromExtraction(result);
    const newText = (partial.texto || "").trim();
    if (source === "observer" && newText === lastExtractedText) {
      return;
    }
    lastExtractedText = newText;
    const textLength = newText.length;
    if (textLength > 800 && !partial.paywallDetected) {
      extractionLocked = true;
      console.log(`[PortalScrapper] Lock activated. Successfully extracted complete article with ${textLength} chars.`);
    }
    const article = {
      ...partial,
      extractionMethod: method,
      confidence
    };
    chrome.runtime.sendMessage({
      type: "ARTICLE_EXTRACTED",
      payload: article,
      isManualRefresh
    });
  }
  function notifySiteDetected() {
    const detected = detectSite();
    if (detected) {
      chrome.runtime.sendMessage({
        type: "SITE_DETECTED",
        payload: detected
      });
    }
  }
  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === "EXTRACT_ARTICLE" || msg.type === "EXTRACT_NOW") {
        if (msg.type === "EXTRACT_NOW") {
          extractionLocked = false;
          lastExtractedText = "";
        }
        handleExtractionRequest("explicit", msg.type === "EXTRACT_NOW");
      } else if (msg.type === "GET_CLEAN_SNAPSHOT") {
        getCleanSnapshotHTML().then((result) => {
          sendResponse(result);
        }).catch((err) => {
          console.error("[PortalScrapper] Error generating clean snapshot:", err);
          sendResponse({ error: err.message || String(err) });
        });
        return true;
      }
    });
  }
  function init() {
    notifySiteDetected();
    setupMessageListener();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
//# sourceMappingURL=content.js.map
