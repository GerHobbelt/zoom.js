/*!
 * zoom.js 0.3 (modified version for use with reveal.js)
 * http://lab.hakim.se/zoom-js
 * MIT licensed
 *
 * Copyright (C) 2011-2014 Hakim El Hattab, http://hakim.se
 */

(function ( window, factory ) {

  if ( typeof module === "object" && typeof module.exports === "object" ) {
    // Expose a factory as module.exports in loaders that implement the Node
    // module pattern (including browserify).
    // This accentuates the need for a real window in the environment
    // e.g. var jQuery = require("jquery")(window);
    module.exports = function( w ) {
      w = w || window;
      if ( !w.document ) {
        throw new Error("ZOOM requires a window with a document");
      }
      return factory( w, w.document );
    };
  } else {
    if ( typeof define === "function" && define.amd ) {
      // AMD. Register as a named module.
      define( "zoom", [], function() {
        return factory(window, document);
      });
    } else {
        // Browser globals
        window.zoom = factory(window, document);
    }
  }

// Pass this, window may not be defined yet
}(this, function ( window, document, undefined ) {

  var zoom = function(zoomer) {

	var TRANSITION_DURATION = 800;
	var level;
    var offsetX, offsetY;
	var mouseX, mouseY;
	var panEngageTimeout = -1;
    var panUpdateInterval = -1;
    var currentOptions;
	var supportsTransforms;
    var timing = TRANSITION_DURATION + "ms";
    var easing = "ease-in-out";
    var	defaultOptions = {
		zoneX: 0.12,			// ratio: the sensitive area near the viewport edge where mouse movement will result in a page pan in zoomed state
		zoneY: 0.12 * 16/9,		// ratio: as above but for vertical panning; by default we use an 'approximately same size' zone as for the width/X
		accelerationFactor: 14 
	}; 			

	// Timeout for callback function
	var callbackTimeout = -1;


	// Zoom out if the user hits escape
	var zoomOutOnESC = function( event ) {
		if( level !== 1 && event.keyCode === 27 ) {
			zoom.out();
		}
    };

	// Monitor mouse movement for panning
	var monitorMouse = function( event ) {
		if( level !== 1 ) {
			mouseX = event.clientX;
			mouseY = event.clientY;
		}
    };

	function init(zoomerElement) {
		// The current zoom level (scale)
		level = 1;

    	offsetX = 0;
		offsetY = 0;

		// The current mouse position, used for panning
		mouseX = 0;
		mouseY = 0;

		// Timeout before pan is activated
		clearTimeout( panEngageTimeout );
		clearInterval( panUpdateInterval );
		panEngageTimeout = -1;
		panUpdateInterval = -1;

    	// Timeout for callback function
		clearTimeout( callbackTimeout );
	    callbackTimeout = -1;

    	currentOptions = extend({}, defaultOptions);

		zoomer = zoomerElement || zoomer || document.body;

		// Check for transform support so that we can fallback otherwise
		supportsTransforms = 	'WebkitTransform' in zoomer.style ||
								'MozTransform' in zoomer.style ||
								'msTransform' in zoomer.style ||
								'OTransform' in zoomer.style ||
								'transform' in zoomer.style;

    	//timing = "0.8s"
    	//easing = "ease-in-out";

		if( supportsTransforms ) {
			// The easing that will be applied when we zoom in/out
			zoomer.style.WebkitTransition = ['-webkit-transform', timing, easing].join(' ');
			zoomer.style.MozTransition = ['-moz-transform', timing, easing].join(' ');
			zoomer.style.msTransition = ['-ms-transform', timing, easing].join(' ');
			zoomer.style.OTransition = ['-o-transform', timing, easing].join(' ');
			zoomer.style.transition = ['transform', timing, easing].join(' ');
		}

		// Zoom out if the user hits escape
		document.removeEventListener( 'keyup', zoomOutOnESC, false );
		document.addEventListener( 'keyup', zoomOutOnESC, false );

		// Monitor mouse movement for panning
		document.removeEventListener( 'mousemove', monitorMouse, false );
		document.addEventListener( 'mousemove', monitorMouse, false );

		return zoom;
	}

	/**
	 * Applies the CSS required to zoom in, prefers the use of CSS3
	 * transforms but falls back on zoom for IE.
	 *
	 * @param {Object} rect
	 * @param {Number} scale
	 */
	function magnify( rect, scale ) {

		var scrollOffset = getScrollOffset();
		var viewport = getViewportSize();

		// Ensure a width/height is set
		rect.width = rect.width || 1;
		rect.height = rect.height || 1;

		// Center the rect within the zoomed viewport
		rect.x -= ( viewport.width - ( rect.width * scale ) ) / 2;
		rect.y -= ( viewport.height - ( rect.height * scale ) ) / 2;

		if( supportsTransforms ) {
			// Reset
			if( scale === 1 ) {
				transformElement( zoomer, '' );
			}
			// Scale
			else {
				var origin = scrollOffset.x + 'px ' + scrollOffset.y + 'px',
					transform = 'translate3d( ' + -rect.x + 'px,' + -rect.y + 'px, 0px ) rotateX( 0deg ) rotateY( 0deg ) scale(' + scale + ')';

				transformElement( zoomer, transform, origin );
			}
		}
		else {
			// Reset
			if( scale === 1 ) {
				zoomer.style.position = '';
				zoomer.style.left = '';
				zoomer.style.top = '';
				zoomer.style.width = '';
				zoomer.style.height = '';
				zoomer.style.zoom = '';
			}
			// Scale
			else {
				zoomer.style.position = 'relative';
				zoomer.style.left = ( - ( scrollOffset.x + rect.x ) / scale ) + 'px';
				zoomer.style.top = ( - ( scrollOffset.y + rect.y ) / scale ) + 'px';
				zoomer.style.width = ( scale * 100 ) + '%';
				zoomer.style.height = ( scale * 100 ) + '%';
				zoomer.style.zoom = scale;
			}
		}

		level = scale;
        offsetX = rect.x;
        offsetY = rect.y;

        if( level !== 1 && document.documentElement.classList ) {
            document.documentElement.classList.add( 'zoomed' );
        }
        else {
            document.documentElement.classList.remove( 'zoomed' );
        }

		return scale;
		
    }

    /**
     * Calculate the number of pixels to pan using an acceleration curve so that very small deltas will produce single pixel movement.
     *
     * @param {Ratio} mouseDeltaRatio a number in the range 0..1, where 0 would be maximum(!) 'force' ~ acceleration. 
     */
    function calculateMovementDelta(mouseDeltaRatio, zoomLevel, fullSpan) {
    	return (1 - mouseDeltaRatio) * 14 / zoomLevel;
    }

	/**
	 * Pan the document when the mouse cursor approaches the edges
	 * of the window.
	 */
	function pan() {
		var viewport = getViewportSize();

		var range = 0.12,
			rangeX = viewport.width * range,
			rangeY = viewport.height * range,
			scrollOffset = getScrollOffset();

		// Up
		if( mouseY < rangeY ) {
			window.scroll( scrollOffset.x, scrollOffset.y - calculateMovementDelta( mouseY / rangeY, level, viewport.height ) );
		}
		// Down
		else if( mouseY > viewport.height - rangeY ) {
			window.scroll( scrollOffset.x, scrollOffset.y + calculateMovementDelta( ( viewport.height - mouseY ) / rangeY, level, viewport.height ) );
		}

		// Left
		if( mouseX < rangeX ) {
			window.scroll( scrollOffset.x - calculateMovementDelta( mouseX / rangeX, level, viewport.width ), scrollOffset.y );
		}
		// Right
		else if( mouseX > viewport.width - rangeX ) {
			window.scroll( scrollOffset.x + calculateMovementDelta( ( viewport.width - mouseX ) / rangeX, level, viewport.width ), scrollOffset.y );
		}
	}

	function getScrollOffset() {
		return {
			x: window.scrollX !== undefined ? window.scrollX : window.pageXOffset,
			y: window.scrollY !== undefined ? window.scrollY : window.pageYOffset
		};
	}

	function getViewportSize() {
		var windowWidth = window.innerWidth;
		var windowHeight = window.innerHeight;
		// IE compatibility
		if (!windowWidth) windowWidth = document.body.offsetWidth;
		if (!windowHeight) windowHeight = document.body.offsetHeight;

		return {
			width: windowWidth,
			height: windowHeight
		};
	}

    /**
     * Applies a CSS transform to the target element.
     */
    function transformElement( element, transform, origin ) {

        element.style.WebkitTransform = transform;
        element.style.MozTransform = transform;
        element.style.msTransform = transform;
        element.style.OTransform = transform;
        element.style.transform = transform;

        if (typeof origin !== 'undefined') {
            element.style.WebkitTransformOrigin = origin;
            element.style.MozTransformOrigin = origin;
            element.style.msTransformOrigin = origin;
            element.style.OTransformOrigin = origin;
            element.style.transformOrigin = origin;
        }
        else {
	        // else: do not reset the transformOrigin as it is still needed for the reset CSS3 animation.
        
            // element.style.WebkitTransformOrigin = null;
            // element.style.MozTransformOrigin = null;
            // element.style.msTransformOrigin = null;
            // element.style.OTransformOrigin = null;
            // element.style.transformOrigin = null;
        }

    }

    /**
     * Extend object `a` with the properties of object `b`.
     * If there's a conflict, object `b` takes precedence.
     *
     * Return the augmented `a` object as the result. 
     */
    function extend( a, b ) {

        if( b ) {
            for( var i in b ) {
                a[ i ] = b[ i ];
            }
        }
        return a;

    }

	return {
		/**
		 * Zooms in on either a rectangle or HTML element.
		 *
		 * @param {Object} options
		 *
		 *   (required)
		 *   - element: HTML element to zoom in on
		 *   OR
		 *   - x/y: coordinates in non-transformed space to zoom in on
		 *   - width/height: the portion of the screen to zoom in on
		 *   - scale: can be used instead of width/height to explicitly set scale
		 *
		 *   (optional)
		 *   - callback: call back when zooming in ends
		 *   - padding: spacing around the zoomed in element
		 */
		to: function( options ) {

			if( level !== 1 || !options ) {
				zoom.out();
			}
			else {
				delete currentOptions.element;
				options = extend(currentOptions, options);

				options.x = options.x || 0;
				options.y = options.y || 0;

				// If an element is set, that takes precedence
				if( !!options.element ) {
					// Space around the zoomed in element to leave on screen
					var padding = typeof options.padding === 'number' ? options.padding : 20;
					var bounds = options.element.getBoundingClientRect();

					options.x = bounds.left - padding;
					options.y = bounds.top - padding;
					options.width = bounds.width + ( padding * 2 );
					options.height = bounds.height + ( padding * 2 );
				}

				var viewport = getViewportSize();				

				// If width/height values are set, calculate scale from those values
				if( options.width !== undefined && options.height !== undefined ) {
					options.scale = Math.max( Math.min( viewport.width / options.width, viewport.height / options.height ), 1 );
				}

				if( options.scale > 1 ) {
					options.x *= options.scale;
					options.y *= options.scale;
					//options.x -= Math.max(0, (viewport.width - options.width * options.scale) / 2);
					//options.y -= Math.max(0, (viewport.height - options.height * options.scale) / 2);

					options.x = Math.max( options.x, 0 );
					options.y = Math.max( options.y, 0 );

					options.scale = magnify( options, options.scale );

					if( options.pan !== false ) {
						clearTimeout( panEngageTimeout );
						clearInterval( panUpdateInterval );
                		panEngageTimeout = -1;
                		panUpdateInterval = -1;

						// Wait with engaging panning as it may conflict with the
						// zoom transition
						panEngageTimeout = setTimeout( function() {
							panUpdateInterval = setInterval( pan, 1000 / 60 );
						}, TRANSITION_DURATION );

					}

					if( typeof options.callback === 'function' ) {
						callbackTimeout = setTimeout( options.callback, TRANSITION_DURATION );
					}
				}

                currentOptions = options;
			}
		},

		/**
		 * Resets the document zoom state to its default.
		 *
		 * @param {Object} options
		 *   - callback: call back when zooming out ends
		 */
		out: function( options ) {
			clearTimeout( panEngageTimeout );
			clearInterval( panUpdateInterval );
			clearTimeout( callbackTimeout );
    		panEngageTimeout = -1;
    		panUpdateInterval = -1;
    	    callbackTimeout = -1;

			level = magnify( { x: 0, y: 0 }, 1 );

			if( options && typeof options.callback === 'function' ) {
				setTimeout( options.callback, TRANSITION_DURATION );
			}
		},

		// Alias
		magnify: function( options ) {
			this.to( options );
		},
		reset: function( options ) {
			if ( options ) {
		    	currentOptions = extend({}, defaultOptions);
		    	currentOptions = extend(currentOptions, options);
			}

			this.out();
		},

		zoomLevel: function() {
			return level;
		},

        offset: function() {
            return [offsetX, offsetY];
        },

        // set/get the DOM HTMLElement reference to the node which will receive the zoom transform
        origin: function (el) {
            zoomer = el || zoomer;
            return zoomer;
        },

		// allow re-initialization ZOOM:
		init: init
	};
  };

  zoom = zoom();

  return zoom;

}));

