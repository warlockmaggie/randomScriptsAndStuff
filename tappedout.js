(function() {
  'use strict';

  // Localize jQuery variable
  var jQuery;
  var apiDomain = 'https://tappedout.net/';
  var deckClass = 'deck-list';
  var cardClass = 'mtgcard';
  var cssLocation = 'https://tappedout.net/tappedout-widget.css';

  /******** Load jQuery if not present *********/
  if (window.jQuery === undefined || window.jQuery.fn.jquery !== '3.2.1') {
    var script_tag = document.createElement('script');
    script_tag.setAttribute("type","text/javascript");
    script_tag.setAttribute("integrity","sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=");
    script_tag.setAttribute("crossorigin","anonymous");
    script_tag.setAttribute("src",
      "https://code.jquery.com/jquery-3.2.1.min.js");
    if (script_tag.readyState) {
      script_tag.onreadystatechange = function () { // For old versions of IE
        if (this.readyState === 'complete' || this.readyState === 'loaded') {
          scriptLoadHandler();
        }
      };
    } else { // Other browsers
      script_tag.onload = scriptLoadHandler;
    }
    // Try to find the head, otherwise default to the documentElement
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
  } else {
    // The jQuery version on the window is the one we want to use
    jQuery = window.jQuery;
    main();
  }

  function loadCSS() {
    var link_tag = document.createElement('link');
    link_tag.setAttribute('rel', 'stylesheet');
    link_tag.setAttribute('type', 'text/css');
    link_tag.setAttribute('href', cssLocation);
    (document.getElementsByTagName("head")[0] || document.documentElement).appendChild(link_tag)
  }

  /******** Called once jQuery has loaded ******/
  function scriptLoadHandler() {
    // Restore $ and window.jQuery to their previous values and store the
    // new jQuery in our local jQuery variable
    jQuery = window.jQuery.noConflict(true);
    // Call our main function
    main();
    initPopover();
  }
  /* Object for each deck list */
  function newCard(context, inline) {
    var card = {
      context: context,
      cache: {},
      init: function() {
        var self = this;
        var cardDom = jQuery(self.context);
        var contents = cardDom.html();
        self.token = contents;
        self.load(contents);
      },
      load: function (contents) {
        var self = this;
        // Retrieve Cached html if available
        // else build and cache
        if (self.cache[self.token]) {
          jQuery(self.context).html(self.cache[self.token]);
          self.postrender();
        } else {
          var params = {
            card: contents
          };
          jQuery.get(apiDomain + 'api/v1/render_card/', params, function(results) {
            var render = results.render;
            if (inline) {
              render = '<span class="tappedOut">' + render + '</span>'
            }
            self.cache[self.token] = render;
            self.render(render);
          });
        }
      },
      render: function (contents) {
        var self = this;
        jQuery(self.context).html(contents);
        self.postrender();
      },
      postrender: function () {
        var self = this;
        jQuery(self.context).find('[rel="popover"]').popover({
          html: true,
          trigger: 'hover',
          content: function () {
            return '<img src="'+jQuery(this).data('card-img') + '" />';
          }
        });
        // see: http://jsfiddle.net/kjeg8/
      }
    };
    card.init();
    return card;
  }

  /* Object for each deck list */
  function newDeck(context) {
    var deck = {
      context: context,
      cache: {},
      cards: null,
      sort: 'type',
      main: null,
      side: null,
      chart: null,
      stub: null,
      showPrice: true,
      ckpartner: null,
      ckprice: null,
      tcgpartner: null,
      tcgprice: null,

      init: function () {
        var self = this;
        var deckDom = jQuery(self.context);
        var stub = deckDom.data('stub');
        if (deckDom.data('checkout-buttons') === false) {
          deck.showPrice = false
        }
        self.tcgpartner = deckDom.data('tcg-partner') || "TPPDOUT";
        self.ckpartner = deckDom.data('card-kingdom-partner') || "tappedout";
        if (stub) {
          self.stub = stub;
        } else {
          var contents = cleanUp(deckDom.html());
          contents = canParse(contents, deckDom.hasClass('deck-list'));
          if (contents === false) {
            // Not a deck list. So, let's leave this alone.
            return false;
          }
          deckDom.addClass(deckClass.replace('.', ''));

          var decklist = processDecklist(contents);
          if (decklist) {
            self.main = decklist.main;
            self.side = decklist.side;
          }
        }
        self.load();
      },

      load: function () {
        var self = this;
        // Retrieve Cached html if available
        // else build and cache
        if (self.cache[self.sort]) {
          jQuery(self.context).html(self.cache[self.sort]);
          self.postrender();
        } else {
          var cols = parseInt(jQuery(self.context).data('cols'));
          var params = {
            board    : self.main,
            side     : self.side,
            c        : self.sort,
            deck     : self.stub,
            cols     : isNaN(cols) ? 6 : cols
          };
          jQuery.post(apiDomain + 'api/deck/widget/', params, function(results) {
            self.chart = results.pie_chart;
            self.url   = results.url || null;
            self.title = results.title || null;
            self.cards = results.cards || null;
            self.ckprice = results.ckprice || null;
            self.tcgprice = results.tcgprice || null;
            self.render(results.board);
          });
        }
      },

      render: function (contents) {
        var self = this;
        var html;
        var header = '<div class="tappedout_header">';
        if (self.chart) {
          header = header + '<div class="pie-chart"><img src="' + self.chart + '"></div>';
        }
        if (self.title) {
          header = header + '<div class="tappedout_title"><a href="' + self.url + '">' + self.title + '</a></div>';
        }

        header = header + 'Sort by '
          + '<select class="tappedout_sorter">'
          + '<option value="type">Type</option>'
          + '<option value="cost">Converted Cost</option>'
          + '<option value="set">Latest Set</option>'
          + '<option value="color">Color</option>'
          + '<option value="rarity">Rarity</option>'
          + '<option value="name">Name</option>'
          + '<option value="keyword">Keyword</option>'
          + '</select></div>';

        var price = '';
        if (self.cards && self.showPrice) {
          price = '<div class="tappedout-checkout-container">';
          price = price +
            '<div class="tappedout_tcg"><form target="_newtcg" name="tcg_checkout" method="post" action="https://store.tcgplayer.com/massentry/?partner=' + self.tcgpartner + '&utm_source=' + self.tcgpartner + '&tappedout&utm_medium=tappedout-embed&utm_campaign=affiliate">' +
              '<input type="hidden" name="c" value="' + self.cards + '">' +
              '<input type="hidden" name="utm_campaign" value="affiliate">' +
              '<input type="hidden" name="utm_medium" value="tappedout-embed">' +
              '<input type="hidden" name="utm_source" value="' + self.tcgpartner + '">' +
              '<input type="hidden" name="partner" value="' + self.tcgpartner + '">' +
              '<button type="submit">' +
                'Checkout @ TCGPlayer' + (self.tcgprice !== null ? ': ' + self.tcgprice.toFixed(2) : '') +
              '</button>' +
            '</form></div>';

          price = price +
            '<div class="tappedout_ck"><form target="_newck" name="ck_checkout" method="post" action="https://www.cardkingdom.com/builder/?partner=' + self.ckpartner + '&utm_source=' + self.ckpartner + '&utm_medium=affiliate&utm_campaign=tappedoutembed">' +
              '<input type="hidden" name="c" value="' + self.cards + '">' +
              '<input type="hidden" name="partner" value="' + self.ckpartner + '">' +
              '<button type="submit">' +
                'Checkout @ Card Kingdom' + (self.ckprice !== null ? ': ' + self.ckprice.toFixed(2) : '') +
              '</button>' +
            '</form></div>';
          price = price + '</div>';
        }

        var footer = '<div class="tappedout_footer">'
          + '<a href="//tappedout.net">Powered by TappedOut.net &copy;</a>'
          + '</div>';

        html = '<div class="tappedOut">'
          + header
          + '<div class="tappedout_body">' + contents + '</div>'
          + price
          + footer
          + '</div>';
        self.cache[self.sort] = html;
        jQuery(self.context).html(html);
        self.postrender();
      },

      postrender: function () {
        var self = this;
        jQuery(self.context).find('select').val(self.sort);
        jQuery(self.context).find('select').change(function () {
          self.sort = jQuery(this).val();
          self.load();
        });
        // initialize popovers
        jQuery(self.context).find('[rel="popover"]').popover({
          html: true,
          trigger: 'hover',
          content: function () {
            return '<img src="'+jQuery(this).data('card-img') + '" />';
          }
        });
        // see: http://jsfiddle.net/kjeg8/
      }
    };
    deck.init();
    return deck;
  }

  /******** Our main function ********/
  function main() {
    // Load CSS
    loadCSS();
    jQuery(document).ready(function() {
      // On Load
      jQuery('.' + deckClass + ', blockquote').each(
        function() {
          return newDeck(this);
        }
      );
      jQuery('span.' + cardClass).each(
        function() {
          return newCard(this, true);
        }
      );
    });
  }

  /* Separate Main Deck from Sideboard */
  function processDecklist(list) {
    var parts = [];
    if (list.indexOf("sideboard") >= 0) {
      // Split on Sideboard
      parts = list.split('sideboard');
    } else {
      parts[0] = list;
    }

    return {
      main: parts[0],
      side: parts[1] || ''
    };
  }

  function canParse(content, isLenient) {
    var str;
    if (isLenient) {
      str = content.match(/^\s*(sideboard|[0-9]+x*([^\(\n])+)/igm) || [];
    } else {
      str = content.match(/^\s*(sideboard|[0-9]+x([^\(\n])+)/igm) || [];
    }
    str = str.join('\n');
    str = stripWhiteSpace(str);
    return (str.length > 0) ? str : false;
  }

  /* Clean Up the list */
  function cleanUp(list) {
    list = stripTags(list);
    list = list.replace(/(?=[^\,])[0-9]+/g, "\n" + "$&");
    list = stripWhiteSpace(list);
    list = list.replace(/sideboard/i, 'sideboard');
    list = list.replace(/sideboard:/, 'sideboard');
    if (list.indexOf('sideboard') < 0) {
      list.replace("\n\n", "\n\nsideboard\n");
    } else {
      list.replace("\n\n", "\n");
    }
    return list;
  }

  /* Cleans non-standard items from the list */
  function stripWhiteSpace(textList) {
    // Strip preceding white space
    textList = textList.replace(/^\s+/, '');
    var list = textList.split("\n");
    for (var i = 0, len = list.length; i < len; i += 1) {
      list[i] = list[i].replace(/^\s+|\s+$/g, '');
    }
    return list.join("\n");
  }

  /* Strip HTML Tags */
  function stripTags(html) {
    var div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || div.innerText || "";
  }



  function initPopover() {

    /* ========================================================================
     * Bootstrap: tooltip.js v3.0.0
     * http://twbs.github.com/bootstrap/javascript.html#affix
     * Inspired by the original jQuery.tipsy by Jason Frame
     * ========================================================================
     * Copyright 2012 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ======================================================================== */


    (function ($) {
      "use strict";

      // TOOLTIP PUBLIC CLASS DEFINITION
      // ===============================

      var Tooltip = function (element, options) {
        this.type = this.options = this.enabled = this.timeout = this.hoverState = this.$element = null;

        this.init('tooltip', element, options)
      };

      Tooltip.DEFAULTS = {
        animation: true,
        placement: 'top',
        selector: false,
        template: '<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
        trigger: 'hover focus',
        title: '',
        delay: 0,
        html: false,
        container: null
      };

      Tooltip.prototype.init = function (type, element, options) {
        this.enabled  = true;
        this.type     = type;
        this.$element = $(element);
        this.options  = this.getOptions(options);

        var triggers = this.options.trigger.split(' ');

        for (var i = triggers.length; i--;) {
          var trigger = triggers[i];

          if (trigger === 'click') {
            this.$element.on('click.' + this.type, this.options.selector, $.proxy(this.toggle, this))
          } else if (trigger !== 'manual') {
            var eventIn  = trigger === 'hover' ? 'mouseenter' : 'focus';
            var eventOut = trigger === 'hover' ? 'mouseleave' : 'blur';

            this.$element.on(eventIn + '.' + this.type, this.options.selector, $.proxy(this.enter, this));
            this.$element.on(eventOut + '.' + this.type, this.options.selector, $.proxy(this.leave, this));
          }
        }

        this.options.selector ?
          (this._options = $.extend({}, this.options, { trigger: 'manual', selector: '' })) :
          this.fixTitle()
      };

      Tooltip.prototype.getDefaults = function () {
        return Tooltip.DEFAULTS
      };

      Tooltip.prototype.getOptions = function (options) {
        options = $.extend({}, this.getDefaults(), this.$element.data(), options);

        if (options.delay && typeof options.delay === 'number') {
          options.delay = {
            show: options.delay,
            hide: options.delay
          }
        }

        return options
      };

      Tooltip.prototype.enter = function (obj) {
        var defaults = this.getDefaults();
        var options  = {};

        this._options && $.each(this._options, function (key, value) {
          if (defaults[key] !== value) options[key] = value
        });

        var self = obj instanceof this.constructor ?
          obj : $(obj.currentTarget)[this.type](options).data('bs.' + this.type);

        clearTimeout(self.timeout);

        if (!self.options.delay || !self.options.delay.show) return self.show();

        self.hoverState = 'in';
        self.timeout    = setTimeout(function () {
          if (self.hoverState === 'in') self.show()
        }, self.options.delay.show)
      };

      Tooltip.prototype.leave = function (obj) {
        var self = obj instanceof this.constructor ?
          obj : $(obj.currentTarget)[this.type](this._options).data('bs.' + this.type);

        clearTimeout(self.timeout);

        if (!self.options.delay || !self.options.delay.hide) return self.hidep();

        self.hoverState = 'out';
        self.timeout    = setTimeout(function () {
          if (self.hoverState === 'out') self.hidep()
        }, self.options.delay.hide)
      };

      Tooltip.prototype.show = function () {
        var e = $.Event('show.bs.'+ this.type);

        if (this.hasContent() && this.enabled) {
          this.$element.trigger(e);

          if (e.isDefaultPrevented()) return;

          var $tip = this.tip();

          this.setContent();

          if (this.options.animation) $tip.addClass('fade');

          var placement = typeof this.options.placement === 'function' ?
            this.options.placement.call(this, $tip[0], this.$element[0]) :
            this.options.placement;

          var autoToken = /\s?auto?\s?/i;
          var autoPlace = autoToken.test(placement);
          if (autoPlace) placement = placement.replace(autoToken, '') || 'top';

          $tip.detach().css({ top: 0, left: 0, display: 'block' }).addClass(placement);

          this.options.container ? $tip.appendTo(this.options.container) : $tip.insertAfter(this.$element);

          var pos          = this.getPosition();
          var actualWidth  = $tip[0].offsetWidth;
          var actualHeight = $tip[0].offsetHeight;

          if (autoPlace) {
            var $parent = this.$element.parent();

            var orgPlacement = placement;
            var docScroll    = document.documentElement.scrollTop || document.body.scrollTop;
            var parentWidth  = this.options.container === 'body' ? window.innerWidth  : $parent.outerWidth();
            var parentHeight = this.options.container === 'body' ? window.innerHeight : $parent.outerHeight();
            var parentLeft   = this.options.container === 'body' ? 0 : $parent.offset().left;

            if (placement === 'bottom' && pos.top + pos.height + actualHeight - docScroll > parentHeight)
              placement = 'top';
            else if (placement === 'top' && pos.top - docScroll - actualHeight < 0)
              placement = 'bottom';
            else if (placement === 'right' && pos.right + actualWidth > parentWidth)
              placement = 'left';
            else if (placement === 'left' && pos.left - actualWidth < parentLeft)
              placement = 'right';

            $tip.removeClass(orgPlacement).addClass(placement)
          }

          var calculatedOffset = this.getCalcuatedOffset(placement, pos, actualWidth, actualHeight);

          this.applyPlacement(calculatedOffset, placement);
          this.$element.trigger('shown.bs.' + this.type)
        }
      };

      Tooltip.prototype.applyPlacement = function(offset, placement) {
        var replace;
        var $tip   = this.tip();
        var width  = $tip[0].offsetWidth;
        var height = $tip[0].offsetHeight;

        // manually read margins because getBoundingClientRect includes difference
        var marginTop = parseInt($tip.css('margin-top'), 10);
        var marginLeft = parseInt($tip.css('margin-left'), 10);

        // we must check for NaN for ie 8/9
        if (isNaN(marginTop))  marginTop  = 0;
        if (isNaN(marginLeft)) marginLeft = 0;

        offset.top  = offset.top  + marginTop;
        offset.left = offset.left + marginLeft;

        $tip
          .offset(offset)
          .addClass('in');

        // check to see if placing tip in new offset caused the tip to resize itself
        var actualWidth  = $tip[0].offsetWidth;
        var actualHeight = $tip[0].offsetHeight;

        if (placement === 'top' && actualHeight !== height) {
          replace = true;
          offset.top = offset.top + height - actualHeight;
        }

        if (/bottom|top/.test(placement)) {
          var delta = 0;

          if (offset.left < 0) {
            delta       = offset.left * -2;
            offset.left = 0;

            $tip.offset(offset);

            actualWidth  = $tip[0].offsetWidth;
          }

          this.replaceArrow(delta - width + actualWidth, actualWidth, 'left')
        } else {
          this.replaceArrow(actualHeight - height, actualHeight, 'top')
        }

        if (replace) $tip.offset(offset)
      };

      Tooltip.prototype.replaceArrow = function(delta, dimension, position) {
        this.arrow().css(position, delta ? (50 * (1 - delta / dimension) + "%") : '')
      };

      Tooltip.prototype.setContent = function () {
        var $tip  = this.tip();
        var title = this.getTitle();

        $tip.find('.tooltip-inner')[this.options.html ? 'html' : 'text'](title);
        $tip.removeClass('fade in top bottom left right')
      };

      Tooltip.prototype.hidep = function () {
        var $tip = this.tip();
        var e    = $.Event('hidep.bs.' + this.type);

        function complete() { $tip.detach() }

        this.$element.trigger(e);

        if (e.isDefaultPrevented()) return;

        $tip.removeClass('in');

        if($.support.transition && this.$tip.hasClass('fade'))
          $tip.one($.support.transition.end, complete).emulateTransitionEnd(150);
        else
          complete();

        this.$element.trigger('hidden.bs.' + this.type);

        return this;
      };

      Tooltip.prototype.fixTitle = function () {
        var $e = this.$element;
        if ($e.attr('title') || typeof($e.attr('data-original-title')) !== 'string') {
          $e.attr('data-original-title', $e.attr('title') || '').attr('title', '')
        }
      };

      Tooltip.prototype.hasContent = function () {
        return this.getTitle()
      };

      Tooltip.prototype.getPosition = function () {
        var el = this.$element[0];
        return $.extend({}, (typeof el.getBoundingClientRect === 'function') ?
          el.getBoundingClientRect() :
          { width: el.offsetWidth,
            height: el.offsetHeight
          },
          this.$element.offset())
      };

      Tooltip.prototype.getCalcuatedOffset = function (placement, pos, actualWidth, actualHeight) {
        if (placement === 'bottom')
          return { top: pos.top + pos.height,   left: pos.left + pos.width / 2 - actualWidth / 2  };
        else if (placement === 'top')
          return { top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2  };
        else if (placement === 'left')
          return { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth };
        else
          return { top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width }
      };

      Tooltip.prototype.getTitle = function () {
        var title;
        var $e = this.$element;
        var o  = this.options;

        title = $e.attr('data-original-title') || (typeof o.title === 'function' ? o.title.call($e[0]) : o.title);

        return title
      };

      Tooltip.prototype.tip = function () {
        return this.$tip = this.$tip || $(this.options.template)
      };

      Tooltip.prototype.arrow = function () {
        return this.$arrow = this.$arrow || this.tip().find('.tooltip-arrow')
      };

      Tooltip.prototype.toggle = function (e) {
        var self = e ? $(e.currentTarget)[this.type](this._options).data('bs.' + this.type) : this;
        self.tip().hasClass('in') ? self.leave(self) : self.enter(self)
      };

      // TOOLTIP PLUGIN DEFINITION
      // =========================

      var old = $.fn.tooltip;

      $.fn.tooltip = function (option) {
        return this.each(function () {
          var $this   = $(this);
          var data    = $this.data('bs.tooltip');
          var options = typeof option === 'object' && option;

          if (!data) $this.data('bs.tooltip', (data = new Tooltip(this, options)));
          if (typeof option === 'string') data[option]()
        })
      };

      $.fn.tooltip.Constructor = Tooltip;


      // TOOLTIP NO CONFLICT
      // ===================

      $.fn.tooltip.noConflict = function () {
        $.fn.tooltip = old;
        return this
      }

    })(jQuery);

    /* ========================================================================
     * Bootstrap: popover.js v3.0.0
     * http://twbs.github.com/bootstrap/javascript.html#popovers
     * ========================================================================
     * Copyright 2012 Twitter, Inc.
     *
     * Licensed under the Apache License, Version 2.0 (the "License");
     * you may not use this file except in compliance with the License.
     * You may obtain a copy of the License at
     *
     * http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS,
     * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
     * See the License for the specific language governing permissions and
     * limitations under the License.
     * ======================================================================== */


    (function ($) { "use strict";

      // POPOVER PUBLIC CLASS DEFINITION
      // ===============================

      var Popover = function (element, options) {
        this.init('popover', element, options)
      };

      if (!$.fn.tooltip) throw new Error('Popover requires tooltip.js');

      Popover.DEFAULTS = $.extend({} , $.fn.tooltip.Constructor.DEFAULTS, {
        placement: 'right',
        trigger: 'click',
        content: '',
        template: '<div class="popover">' +
                    '<div class="arrow"></div>' +
                    '<h3 class="popover-title"></h3>' +
                    '<div class="popover-content"></div>' +
                  '</div>'
      });


      // NOTE: POPOVER EXTENDS tooltip.js
      // ================================

      Popover.prototype = $.extend({}, $.fn.tooltip.Constructor.prototype);

      Popover.prototype.constructor = Popover;

      Popover.prototype.getDefaults = function () {
        return Popover.DEFAULTS
      };

      Popover.prototype.setContent = function () {
        var $tip    = this.tip();
        var title   = this.getTitle();
        var content = this.getContent();

        $tip.find('.popover-title')[this.options.html ? 'html' : 'text'](title);
        $tip.find('.popover-content')[this.options.html ? 'html' : 'text'](content);

        $tip.removeClass('fade top bottom left right in');

        // Hide empty titles
        //
        // IE8 doesn't accept hiding via the `:empty` pseudo selector, we have to do
        // this manually by checking the contents.
        if ($tip.find('.popover-title').html() === '') {
          $tip.find('.popover-title').hide();
        }
      };

      Popover.prototype.hasContent = function () {
        return this.getTitle() || this.getContent()
      };

      Popover.prototype.getContent = function () {
        var $e = this.$element;
        var o  = this.options;

        return $e.attr('data-content')
          || (typeof o.content === 'function' ?
            o.content.call($e[0]) :
            o.content)
      };

      Popover.prototype.arrow =function () {
        return this.$arrow = this.$arrow || this.tip().find('.arrow')
      };

      Popover.prototype.tip = function () {
        if (!this.$tip) this.$tip = $(this.options.template);
        return this.$tip
      };


      // POPOVER PLUGIN DEFINITION
      // =========================

      var old = $.fn.popover;

      $.fn.popover = function (option) {
        return this.each(function () {
          var $this   = $(this);
          var data    = $this.data('bs.popover');
          var options = typeof option === 'object' && option;

          if (!data) $this.data('bs.popover', (data = new Popover(this, options)));
          if (typeof option === 'string') data[option]()
        })
      };

      $.fn.popover.Constructor = Popover;


      // POPOVER NO CONFLICT
      // ===================

      $.fn.popover.noConflict = function () {
        $.fn.popover = old;
        return this;
      }

    })(jQuery);
  }

})(); // We call our anonymous function immediately
