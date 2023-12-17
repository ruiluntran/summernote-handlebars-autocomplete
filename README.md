# Summernote Handlebars Autocomplete plugin

Summernote handlebars autocomplete plugin for [summernote](https://github.com/summernote/summernote/).

## Demo

https://ruiluntran.github.io/summernote-handlebars-autocomplete/

## Installation

Include the required files and the plugin file after summernote.min.js file.

``` html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.1/css/bootstrap.min.css"/>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote-bs4.min.css"/>
        
<div id="summernote"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/4.6.1/js/bootstrap.bundle.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/summernote/0.8.20/summernote-bs4.min.js"></script>
<script src="../dist/summernote-handlebars-autocomplete.js"></script>
```

## Configuration

To configure the plugin, pass in the options object with the key: `handlebarsAutocomplete` to summernote.


### Example

```javascript
$('#summernote').summernote({
  placeholder: 'Placeholder',
  handlebarsAutocomplete: {
    getSuggestions: (value) => {
      const suggestions = [
        {
          display: 'userName',
          value: 'ruiluntran'
        },
        {
          display: 'ensDomain',
          value: 'ruiluntran.eth'
        }
      ];
      return suggestions.filter(suggestion => {
        return suggestion.display.includes(value);
      });
    }
  }
});
```

## Credits

Forked from https://github.com/team-loxo/summernote-at-mention

## License

The contents of this repository is licensed under [The MIT License.](https://opensource.org/licenses/MIT)
