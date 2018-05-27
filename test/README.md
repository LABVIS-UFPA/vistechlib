## How to Test Module

#### Dependencies

##### Broserify

To install Browserify to use from the command line by running `npm i -g browserify`.

#### Bundle code

Bundle code by running on command line (use the project directory).

`browserify index.js --standalone vistechlib -o test/bundle.js`

This command bundle all code into a web js  -> ./test/bundle.js.
The `vistechlib` is the namespace used to hold objects and classes exported via module.exports.

#### Link the bundled JS into a HTML

Link the bundled JS into a HTML by adding:

```html
<script src="bundle.js"></script>
```
