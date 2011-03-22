/*!
 
 Image Cloud for Flickr
 by timdream (http://timc.idv.tw/)

 usage:
  $('#div').imageCloud(settings); // put word cloud on #image.
 
*/

"use strict";

(function ($) {

	// http://jsfromhell.com/array/shuffle
	Array.prototype.shuffle = function () { //v1.0
		for(var j, x, i = this.length; i; j = parseInt(Math.random() * i), x = this[--i], this[i] = this[j], this[j] = x);
		return this;
	};

	$.fn.imageCloud = function (options) {
	
		var settings = {
			gridSize: 8,
			ellipticity: 1,
			query: 'select * from flickr.photos.search(0,150) where group_id="1502528@N22" and sort="interestingness-desc"',
			flickrSize: 's',
			photos: false,
			photoListType: 'flickr',
			wait: 50,
			fadeIn: 200,
			weightFactor: function (n) {
				n = 1-n;
				return n*n;
			},
			shuffle: true
		};

		if (options) { 
			$.extend(settings, options);
		}
		
		var ngx, ngy, grid, f,
		getPhotos = {
			'flickr': function (callback) {
				$.getJSON(
					'http://query.yahooapis.com/v1/public/yql?q=' + encodeURIComponent(settings.query  + ' and extras="url_' + settings.flickrSize + '"') + '&format=json&diagnostics=true&callback=?',
					function (data, status) {
						if (!data.query.results || !data.query.results.photo) {
							callback(false);
							return;
						}
						callback(data.query.results.photo);
					}
				);
			}
		},
		convertType = {
			'flickr': function (photo) {
				return {
					width: photo['width_' + settings.flickrSize],
					height: photo['height_' + settings.flickrSize],
					photo_url: photo['url_' + settings.flickrSize],
					link_url: 'http://www.flickr.com/photos/' + photo.owner + '/' + photo.id,
					title: photo.title
				}
			}
		},
		canFitPhoto = function (gx, gy, gw, gh) {
			if (gx < 0 || gy < 0 || gx + gw > ngx || gy + gh > ngy) return false;
			var x = gw, y;
			while (x--) {
				y = gh;
				while (y--) {
					if (!grid[gx + x][gy + y]) return false;
				}
			}
			return true;
		},
		updateGrid = function (gx, gy, gw, gh) {
			var x = gw, y;
			while (x--) {
				y = gh;
				while (y--) {
					grid[gx + x][gy + y] = false;
				}
			}
		},
		putPhoto = function ($b, photo, precent) {
			var factor = settings.weightFactor(precent)*f,
				gw = Math.ceil(photo.width*factor/settings.gridSize);
			var gh = Math.ceil(photo.height/photo.width*gw);
			if (gw === 0 || gh === 0) return false;
			var R = Math.floor(Math.sqrt(ngx*ngx+ngy*ngy)), T = ngx+ngy, r, t, points, x, y;
			r = R;
			while (r--) {
				t = T;
				points = [];
				while (t--) {
					points.push(
						[
							Math.floor(ngx/2+(R-r)*Math.cos(t/T*2*Math.PI) - gw/2),
							Math.floor(ngy/2+(R-r)*settings.ellipticity*Math.sin(t/T*2*Math.PI) - gh/2)
						]
					);
				}
				if (points.shuffle().some(
					function (gxy) {
						if (canFitPhoto(gxy[0], gxy[1], gw, gh)) {
							var $i = $('<img />');
							$i.css({
								width: (gw*settings.gridSize).toString(10) + 'px',
								height: (gh*settings.gridSize).toString(10) + 'px',
								left: (gxy[0]*settings.gridSize).toString(10) + 'px',
								top: (gxy[1]*settings.gridSize).toString(10) + 'px',
								display: 'none',
								opacity: r*r/R/R
							});
							$i[0].onload = function () {
								$(this).fadeIn(settings.fadeIn);
							};
							var $a = $('<a href="' + photo.link_url + '" target="_blank" />').append($i);
							$a.attr('title', photo.title);
							$b.append($a);
							$i[0].src = photo.photo_url;
							updateGrid(gxy[0], gxy[1], gw, gh);
							return true;
						}
						return false;
					}
				)) return true;
			}
			return false;
		};

		if (getPhotos[settings.photoListType] && !settings.photos && settings.query) {
			// No photos but query, get it.
			var $j = this;
			getFlickrPhotos(
				function (photos) {
					settings.photos = photos;
					$j.imageCloud(settings);
				}
			);
			return this;
		}
		
		if (convertType[settings.photoListType]) {
			// convert the photo object to native names
			$.each(
				settings.photos,
				function (i, photo) {
					settings.photos[i] = convertType[settings.photoListType](photo);
				}
			);
		}

		if (settings.shuffle) settings.photos = settings.photos.shuffle();

		return this.each(function() {

			//if (this.nodeName.toLowerCase() !== 'div') return;
			ngx = Math.floor(this.offsetWidth/settings.gridSize);
			ngy = Math.floor(this.offsetHeight/settings.gridSize);
			grid = [];
			f = 5*(this.offsetWidth*this.offsetHeight)/(180*240)/150;
			var $this = $(this);
			
			var x = ngx, y;
			while (x--) {
				grid[x] = [];
				y = ngy;
				while (y--) {
					grid[x][y] = true;
				}
			}
			
			$this.empty();
			clearTimeout($this.data('imageCloud-timer'));
			
			var i = 0;
			var timer = setInterval(
				function () {
					if (i >= settings.photos.length) {
						clearTimeout(timer);
						return;
					}
					putPhoto($this, settings.photos[i], i/settings.photos.length);
					i++;
				},
				settings.wait
			);
			$(this).data('wordCloud-timer', timer);
		});
	}
})(jQuery);
