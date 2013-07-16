/*!
 * zoom.js 0.2 (modified version for use with reveal.js)
 * http://lab.hakim.se/zoom-js
 * MIT licensed
 *
 * Copyright (C) 2011-2012 Hakim El Hattab, http://hakim.se
 */
var zoom = function(zoomer){

	// The current zoom level (scale)
	var level = 1;

    var offsetx = 0, offsety = 0;
    
	// The current mouse position, used for panning
	var mouseX = 0,
		mouseY = 0;

	// Timeout before pan is activated
	var panEngageTimeout = -1,
		panUpdateInterval = -1;

    var currentOptions = null;

	zoomer = zoomer || document.body;
	
	// Check for transform support so that we can fallback otherwise
	var supportsTransforms = 	'WebkitTransform' in zoomer.style ||
								'MozTransform' in zoomer.style ||
								'msTransform' in zoomer.style ||
								'OTransform' in zoomer.style ||
								'transform' in zoomer.style;

    var timing = "0.8s"
    var easing = "ease-in-out";
	
	if( supportsTransforms ) {
		// The easing that will be applied when we zoom in/out
		document.body.style.transition = ['transform', timing, easing].join(' ');
		document.body.style.OTransition = ['-o-transform', timing, easing].join(' ');
		document.body.style.msTransition = ['-ms-transform', timing, easing].join(' ');
		document.body.style.MozTransition = ['-moz-transform', timing, easing].join(' ');
		document.body.style.WebkitTransition = ['-webkit-transform', timing, easing].join(' ');
	}

	// Zoom out if the user hits escape
	document.addEventListener( 'keyup', function( event ) {
		if( level !== 1 && event.keyCode === 27 ) {
			zoom.out();
		}
    }, false );

	// Monitor mouse movement for panning
	document.addEventListener( 'mousemove', function( event ) {
		if( level !== 1 ) {
			mouseX = event.clientX;
			mouseY = event.clientY;
		}
    }, false );

	/**
	 * Applies the CSS required to zoom in, prioritizes use of CSS3
	 * transforms but falls back on zoom for IE.
	 *
	 * @param {Number} pageOffsetX
	 * @param {Number} pageOffsetY
	 * @param {Number} elementOffsetX
	 * @param {Number} elementOffsetY
	 * @param {Number} scale
	 */
	function magnify( pageOffsetX, pageOffsetY, elementOffsetX, elementOffsetY, scale ) {

		if( supportsTransforms ) {
			var origin = pageOffsetX +'px '+ pageOffsetY +'px',
				transform = 'translate('+ -elementOffsetX +'px,'+ -elementOffsetY +'px) scale(' + scale + ')';

			zoomer.style.transformOrigin = origin;
			zoomer.style.OTransformOrigin = origin;
			zoomer.style.msTransformOrigin = origin;
			zoomer.style.MozTransformOrigin = origin;
			zoomer.style.WebkitTransformOrigin = origin;

			zoomer.style.transform = transform;
			zoomer.style.OTransform = transform;
			zoomer.style.msTransform = transform;
			zoomer.style.MozTransform = transform;
			zoomer.style.WebkitTransform = transform;
		}
		else {
			// Reset all values
			if( scale === 1 ) {
				zoomer.style.position = '';
				zoomer.style.left = '';
				zoomer.style.top = '';
				zoomer.style.width = '';
				zoomer.style.height = '';
				zoomer.style.zoom = '';
			}
			// Apply scale
			else {
				zoomer.style.position = 'relative';
				zoomer.style.left = ( - ( pageOffsetX + elementOffsetX ) / scale ) + 'px';
				zoomer.style.top = ( - ( pageOffsetY + elementOffsetY ) / scale ) + 'px';
				zoomer.style.width = ( scale * 100 ) + '%';
				zoomer.style.height = ( scale * 100 ) + '%';
				zoomer.style.zoom = scale;
			}
		}

		level = scale;
        offsetx = elementOffsetX;
        offsety = elementOffsetY;

        if( level !== 1 && document.documentElement.classList ) {
            document.documentElement.classList.add( 'zoomed' );
        }
        else {
            document.documentElement.classList.remove( 'zoomed' );
        }
    }

	/**
	 * Pan the document when the mosue cursor approaches the edges
	 * of the window.
	 */
	function pan() {
		var range = 0.12,
			rangeX = window.innerWidth * range,
			rangeY = window.innerHeight * range,
			scrollOffset = getScrollOffset();

		// Up
		if( mouseY < rangeY ) {
			window.scroll( scrollOffset.x, scrollOffset.y - ( 1 - ( mouseY / rangeY ) ) * ( 14 / level ) );
		}
		// Down
		else if( mouseY > window.innerHeight - rangeY ) {
			window.scroll( scrollOffset.x, scrollOffset.y + ( 1 - ( window.innerHeight - mouseY ) / rangeY ) * ( 14 / level ) );
		}

		// Left
		if( mouseX < rangeX ) {
			window.scroll( scrollOffset.x - ( 1 - ( mouseX / rangeX ) ) * ( 14 / level ), scrollOffset.y );
		}
		// Right
		else if( mouseX > window.innerWidth - rangeX ) {
			window.scroll( scrollOffset.x + ( 1 - ( window.innerWidth - mouseX ) / rangeX ) * ( 14 / level ), scrollOffset.y );
		}
	}

	function getScrollOffset() {
		return {
			x: window.scrollX !== undefined ? window.scrollX : window.pageXOffset,
			y: window.scrollY !== undefined ? window.scrollY : window.pageXYffset
		}
	}

	return {
		/**
		 * Zooms in on either a rectangle or HTML element.
		 *
		 * @param {Object} options
		 *   - element: HTML element to zoom in on
		 *   OR
		 *   - x/y: coordinates in non-transformed space to zoom in on
		 *   - width/height: the portion of the screen to zoom in on
		 *   - scale: can be used instead of width/height to explicitly set scale
		 */
		to: function( options ) {
			// Due to an implementation limitation we can't zoom in
			// to another element without zooming out first
			if( level !== 1 ) {
				zoom.out();
			}
			else {
				options.x = options.x || 0;
				options.y = options.y || 0;

				// If an element is set, that takes precedence
				if( !!options.element ) {
					// Space around the zoomed in element to leave on screen
					var padding = 20;

					options.width = options.element.getBoundingClientRect().width + ( padding * 2 );
					options.height = options.element.getBoundingClientRect().height + ( padding * 2 );
					options.x = options.element.getBoundingClientRect().left - padding;
					options.y = options.element.getBoundingClientRect().top - padding;
				}
				var windowWidth = window.innerWidth;
				var windowHeight = window.innerHeight;
				// IE compatability
				if (!windowWidth) windowWidth = document.body.offsetWidth;
				if (!windowHeight) windowHeight = document.body.offsetHeight;

				// If width/height values are set, calculate scale from those values
				if( options.width !== undefined && options.height !== undefined ) {
					options.scale = Math.max( Math.min( windowWidth / options.width, windowHeight / options.height ), 1 );
				}

				if( options.scale > 1 ) {
					options.x *= options.scale;
					options.y *= options.scale;
					options.x -= Math.max(0, (windowWidth - options.width * options.scale) / 2)
					options.y -= Math.max(0, (windowHeight - options.height * options.scale) / 2)

					var scrollOffset = getScrollOffset();

                    if( options.element ) {
                        scrollOffset.x -= ( window.innerWidth - ( options.width * options.scale ) ) / 2;
                    }

					magnify( scrollOffset.x, scrollOffset.y, options.x, options.y, options.scale );

					if( options.pan !== false ) {
						// Wait with engaging panning as it may conflict with the
						// zoom transition
						panEngageTimeout = setTimeout( function() {
							panUpdateInterval = setInterval( pan, 1000 / 60 );
						}, 800 );

					}
				}

                currentOptions = options;
			}
		},

		/**
		 * Resets the document zoom state to its default.
		 */
		out: function() {
			clearTimeout( panEngageTimeout );
			clearInterval( panUpdateInterval );

			var scrollOffset = getScrollOffset();

            if( currentOptions && currentOptions.element ) {
                scrollOffset.x -= ( window.innerWidth - ( currentOptions.width * currentOptions.scale ) ) / 2;
            }

			magnify( scrollOffset.x, scrollOffset.y, 0, 0, 1 );

			level = 1;
		},

		// Alias
		magnify: function( options ) { 
			this.to( options ); 
		},
		reset: function() { 
			this.out(); 
		},

		zoomLevel: function() {
			return level;
		},
        
        offset: function() {
            return [offsetx, offsety];
        }
	}
};

