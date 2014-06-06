# zoom.js

Enables a minimal JS API for zooming in on specific points or DOM elements.

Hacked so that any element can be use as the zoom frame of reference.

*Note that this is only a proof of concept so don't use it for anything important. Does not work in IE, yet.*

[Try out the demo](http://lab.hakim.se/zoom-js/).

# Usage

#### Zoom in on an element:

```
  zoomer = zoom(document.body);

  zoomer.to({ 
    element: document.querySelector( 'img' )
  });
```

#### Zoom in on a point:

```
  zoomer.to({
    x: 100,
    y: 200,
    width: 300,
    height: 300
  });
```

```
  zoomer.to({
    x: 100,
    y: 200,
    scale: 3
  });
```

#### Reset
```
  zoomer.out();
```

# License

MIT licensed

Copyright (C) 2011-2014 Hakim El Hattab, http://hakim.se