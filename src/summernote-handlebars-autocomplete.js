import 'babel-polyfill';

import SelectionPreserver from './selection-preserver';

const WORD_REGEX = /^[^\s]+$/;

const UP_KEY_CODE = 38;
const DOWN_KEY_CODE = 40;
const ENTER_KEY_CODE = 13;

function isPromise(value) {
  return Boolean(value && typeof value.then === 'function');
}


(function (factory) {
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('jquery'));
  } else {
    factory(window.jQuery);
  }
})(function ($) {
  $.extend($.summernote.plugins, {
    handlebarsAutocomplete: function (context) {
      /************************
       * Setup instance vars. *
       ************************/
      this.editableEl = context.layoutInfo.editable[0];

      this.autocompleteAnchor = {
        left: null,
        top: null
      };
      this.autocompleteContainer = null;
      this.showingAutocomplete = false;
      this.selectedIndex = null;
      this.suggestions = null;
      this.hoverColor = '#1e90ff';
      this.backgroundColor = '#e4e4e4';
      this.fontSize = '12px';

      this.getSuggestions = _ => {
        return [];
      };

      /********************
       * Read-in options. *
       ********************/
      if (context.options && context.options && context.options.handlebarsAutocomplete) {
        const summernoteOptions = context.options.handlebarsAutocomplete;

        if (summernoteOptions.getSuggestions) {
          this.getSuggestions = summernoteOptions.getSuggestions;
        }

        if (summernoteOptions.onSelect) {
          this.onSelect = summernoteOptions.onSelect;
        }

        if (summernoteOptions.hoverColor) {
          this.hoverColor = summernoteOptions.hoverColor;
        }

        if (summernoteOptions.backgroundColor) {
          this.backgroundColor = summernoteOptions.backgroundColor;
        }

        if (summernoteOptions.fontSize) {
          this.fontSize = summernoteOptions.fontSize;
        }

      }

      /**********
       * Events *
       **********/
      this.events = {
        'summernote.blur': () => {
          if (this.showingAutocomplete) {
            this.hideAutocomplete();
          }
        },
        'summernote.keydown': (_, event) => {
          if (this.showingAutocomplete) {
            switch (event.keyCode) {
              case ENTER_KEY_CODE: {
                event.preventDefault();
                event.stopPropagation();
                this.handleEnter();
                break;
              }
              case UP_KEY_CODE: {
                event.preventDefault();
                event.stopPropagation();
                const newIndex =
                  this.selectedIndex === 0 ? 0 : this.selectedIndex - 1;
                this.updateAutocomplete(this.suggestions, newIndex);
                break;
              }
              case DOWN_KEY_CODE: {
                event.preventDefault();
                event.stopPropagation();
                const newIndex =
                  this.selectedIndex === this.suggestions.length - 1
                    ? this.selectedIndex
                    : this.selectedIndex + 1;

                this.updateAutocomplete(this.suggestions, newIndex);
                break;
              }
            }
          }
        },
        'summernote.keyup': (_, event) => {
          const selection = document.getSelection();
          const currentText = selection.anchorNode.nodeValue;
          const {word, absoluteIndex} = this.findWordAndIndices(currentText || '', selection.anchorOffset);
          const trimmedWord = word.slice(2);

          if (this.showingAutocomplete && ![DOWN_KEY_CODE, UP_KEY_CODE, ENTER_KEY_CODE].includes(event.keyCode)) {

            if (word[0] === '{' && word[1] === '{') {
              const suggestions = this.getSuggestions(trimmedWord);
              this.updateAutocomplete(suggestions, this.selectedIndex);
            } else {
              this.hideAutocomplete();
            }
          } else if (!this.showingAutocomplete && word[0] === '{' && word[1] === '{') {

            const suggestions = this.getSuggestions(trimmedWord);

            if (isPromise(suggestions)) {
              suggestions.then(result => {
                this.suggestions = result;
                this.selectedIndex = 0;
                this.showAutocomplete(absoluteIndex, selection.anchorNode);
              })
            } else {
              this.suggestions = suggestions;
              this.selectedIndex = 0;
              this.showAutocomplete(absoluteIndex, selection.anchorNode);
            }

          }
        }
      };

      /***********
       * Helpers *
       ***********/

      this.handleEnter = () => {
        this.handleSelection();
      };

      this.handleClick = suggestion => {
        const selectedIndex = this.suggestions.findIndex(s => s === suggestion);

        if (selectedIndex === -1) {
          throw new Error('Unable to find suggestion in suggestions.');
        }

        this.selectedIndex = selectedIndex;
        this.handleSelection();
      };

      this.handleSelection = () => {
        if (this.suggestions === null || this.suggestions.length === 0) {
          return;
        }

        const newWord = this.suggestions[this.selectedIndex].value;

        if (this.onSelect !== undefined) {
          this.onSelect(newWord);
          return;
        }

        const selection = document.getSelection();
        const currentText = selection.anchorNode.nodeValue;
        const {word, absoluteIndex} = this.findWordAndIndices(currentText || '', selection.anchorOffset);

        const selectionPreserver = new SelectionPreserver(this.editableEl);
        selectionPreserver.preserve();

        selection.anchorNode.textContent = currentText.slice(0, absoluteIndex + 2) + newWord + currentText.slice(absoluteIndex + word.length) + '}}';

        selectionPreserver.restore(absoluteIndex + newWord.length + 4);

        if (context.options.onChange !== undefined) {
          context.options.onChange(this.editableEl.innerHTML);
        }

        setTimeout(() => {
          this.hideAutocomplete();
        }, 200)
      };

      this.updateAutocomplete = (suggestions, selectedIndex) => {
        this.selectedIndex = selectedIndex;
        this.suggestions = suggestions;
        this.renderAutocomplete();
      };

      this.showAutocomplete = (atTextIndex, indexAnchor) => {
        if (this.showingAutocomplete) {
          throw new Error('Cannot call showAutocomplete if autocomplete is already showing.');
        }
        this.setAutocompleteAnchor(atTextIndex, indexAnchor);
        this.renderAutocompleteContainer();
        this.renderAutocomplete();
        this.showingAutocomplete = true;
      };

      this.renderAutocompleteContainer = () => {
        this.autocompleteContainer = document.createElement('div');
        this.autocompleteContainer.style.top = String(this.autocompleteAnchor.top) + 'px';
        this.autocompleteContainer.style.left = String(this.autocompleteAnchor.left) + 'px';
        this.autocompleteContainer.style.position = 'absolute';
        this.autocompleteContainer.style.backgroundColor = this.backgroundColor;
        this.autocompleteContainer.style.zIndex = Number.MAX_SAFE_INTEGER;
        this.autocompleteContainer.style.fontSize = this.fontSize;
        document.body.appendChild(this.autocompleteContainer);
      };

      this.renderAutocomplete = () => {
        if (this.autocompleteContainer === null) {
          throw new Error('Cannot call renderAutocomplete without an autocompleteContainer. ');
        }
        const autocompleteContent = document.createElement('div');

        this.suggestions.forEach((suggestion, idx) => {
          const suggestionDiv = document.createElement('div');
          suggestionDiv.textContent = suggestion.display;
          suggestionDiv.style.padding = '8px 20px';

          if (this.selectedIndex === idx) {
            suggestionDiv.style.backgroundColor = this.hoverColor;
            suggestionDiv.style.color = 'white';
          }

          suggestionDiv.addEventListener('mousedown', () => {
            this.handleClick(suggestion);
          });

          autocompleteContent.appendChild(suggestionDiv);
        });

        this.autocompleteContainer.innerHTML = '';
        this.autocompleteContainer.appendChild(autocompleteContent);
      };

      this.hideAutocomplete = () => {
        if (!this.showingAutocomplete) {
          throw new Error('Cannot call hideAutocomplete if autocomplete is not showing.');
        }

        document.body.removeChild(this.autocompleteContainer);
        this.autocompleteAnchor = {left: null, top: null};
        this.selectedIndex = null;
        this.suggestions = null;
        this.showingAutocomplete = false;
      };

      this.findWordAndIndices = (text, offset) => {
        if (offset > text.length) {
          return {word: '', relativeIndex: 2};
        } else {
          let leftWord = '';
          let rightWord = '';
          let relativeIndex = 0;
          let absoluteIndex = offset;

          for (let currentOffset = offset; currentOffset > 0; currentOffset--) {
            if (text[currentOffset - 1].match(WORD_REGEX)) {
              leftWord = text[currentOffset - 1] + leftWord;
              relativeIndex++;
              absoluteIndex--;
            } else {
              break;
            }
          }

          for (let currentOffset = offset - 1; currentOffset > 0 && currentOffset < text.length - 1; currentOffset++) {
            if (text[currentOffset + 1].match(WORD_REGEX)) {
              rightWord = rightWord + text[currentOffset + 1];
            } else {
              break;
            }
          }

          return {
            word: leftWord + rightWord,
            relativeIndex,
            absoluteIndex
          };
        }
      };

      this.setAutocompleteAnchor = (atTextIndex, indexAnchor) => {
        let html = indexAnchor.parentNode.innerHTML;
        const text = indexAnchor.nodeValue;

        let atIndex = -1;
        for (let i = 0; i <= atTextIndex; i++) {
          if (text[i] === '{' && text[i + 1] === '{') {
            atIndex = atIndex + 2;
          }
        }

        let htmlIndex;
        for (let i = 0, htmlAtIndex = 0; i < html.length; i++) {
          if (html[i] === '{' && html[i + 1] === '{') {
            if (htmlAtIndex === atIndex) {
              htmlIndex = i + 1;
              break;
            } else {
              htmlAtIndex = htmlAtIndex + 1;
            }
          }
        }

        const atNodeId = 'at-node-' + String(Math.floor(Math.random() * 10000));
        const spanString = `<span id="${atNodeId}">{{</span>`;

        const selectionPreserver = new SelectionPreserver(this.editableEl);
        selectionPreserver.preserve();

        indexAnchor.parentNode.innerHTML = html.slice(0, htmlIndex) + spanString + html.slice(htmlIndex + 2);
        const anchorElement = document.querySelector('#' + atNodeId);
        const anchorBoundingRect = anchorElement.getBoundingClientRect();

        this.autocompleteAnchor = {
          top: anchorBoundingRect.top + anchorBoundingRect.height + 2,
          left: anchorBoundingRect.left
        };

        selectionPreserver.findRangeStartContainer().parentNode.innerHTML = html;
        selectionPreserver.restore();
      };
    }
  });
});
