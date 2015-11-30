// ## Fourdollar::
// 범용 라이브러리.


(function () {



var $4 = {
  unique: {}
};





// ##### 비동기 콜백을 Promise 로 변경.
//
// usage:
// ```js
// var fs = require('fs');
// var $4 = require('./fourdollar');
//
// var _stat = $4.makePromise(fs.stat);
// _stat('/Users/naki/.atom/packages/bynote/p-fs.js')
// .then(function (stats) {
//   console.log(stats);
// }).catch(function (err) {
//   console.log(err.stack);
// });
// ```
// `hasErr`: 콜백 함수의 첫번째 인수가 `error`가 아니라면 `false`전달.
$4.makePromise = function (func, hasErr) {
  if(typeof hasErr === 'undefined') {
    hasErr = true;
  }
  return function () {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function (resolve, reject) {
      args.push(function (err) {
        var args = Array.prototype.slice.call(arguments);
        if(hasErr && err) {
          reject(err);
        } else if(hasErr) {
          resolve.apply(this, args.slice(1, 1000));
        } else {
          resolve.apply(this, args);
        }
      }.bind(this));
      func.apply(this, args);
    });
  }
};


// ##### 객체를 확장한다.
//
// usage:
// ```js
// it('객체를 확장할 수 있다.', function () {
//   var objA = {hello: 'hello', world: 'world'};
//   var objB = {foo: 'foo', bar: 'bar'};
//   var extendedObj = $4.extend(objA, objB);
//   expect(extendedObj.foo).toEqual('foo');
//   expect(extendedObj.bar).toEqual('bar');
//   expect(objA.foo).toEqual('foo');
//   expect(objA.bar).toEqual('bar');
// });
// ```
$4.extend = function() {
	var options, name, src, copy, copyIsArray, clone,
		target = arguments[0] || {},
		i = 1,
		length = arguments.length,
		deep = false;

	if ( typeof target === "boolean" ) {
		deep = target;
		target = arguments[ i ] || {};
		i++;
	}

	if ( typeof target !== "object" && !jQuery.isFunction(target) ) {
		target = {};
	}

	if ( i === length ) {
		target = this;
		i--;
	}

	for ( ; i < length; i++ ) {
		if ( (options = arguments[ i ]) != null ) {
			for ( name in options ) {
				src = target[ name ];
				copy = options[ name ];

				if ( target === copy ) {
					continue;
				}

				if ( deep && copy && ( jQuery.isPlainObject(copy) || (copyIsArray = jQuery.isArray(copy)) ) ) {
					if ( copyIsArray ) {
						copyIsArray = false;
						clone = src && jQuery.isArray(src) ? src : [];

					} else {
						clone = src && jQuery.isPlainObject(src) ? src : {};
					}

					target[ name ] = jQuery.extend( deep, clone, copy );

				} else if ( copy !== undefined ) {
					target[ name ] = copy;
				}
			}
		}
	}

	return target;
};



// ### Node.js에서만 포함되는 라이브러리
node = function () {
  var fs = require('fs');
  var path = require('path');
  var process = require('process');
  var url = require('url');

  node = {}

  // ##### 버퍼들을 하나로 합친다.
  // ```js
  // var buf1 = new Buffer('foo');
  // var buf2 = new Buffer('bar');
  // var buf3 = new Buffer('!!');
  //
  // it('버퍼들을 하나로 합친다.', function () {
  //   var merge = $4.mergeBuffers(buf1, buf2, buf3);
  //   expect(merge.toString()).toEqual('foobar!!');
  // });
  // ```
  node.mergeBuffers = function () {
    var args = arguments;
    var length = 0;
    for(var i = 0; i < args.length; i++) {
      length += args[i].length;
    }

    var merge = new Buffer(length);
    var offset = 0;
    for(var i = 0; i < args.length; i++) {
      args[i].copy(merge, offset);
      offset += args[i].length;
    }

    return merge;
  };


  // ##### 홈디렉토리를 기준으로 resolve path를 만든다.
  //
  // ```js
  // var homeDir = process.env.HOME || process.env.USERPROFILE;
  //
  // it('홈디렉토리가 기준이다.', function () {
  //   expect($4.resolveHome()).toEqual(homeDir);
  // });
  //
  // it('홈디렉토리로 시작하는 path.resolve와 같아야 한다.', function () {
  //   expect($4.resolveHome('foo', 'bar'))
  //     .toEqual(path.resolve(homeDir, 'foo', 'bar'));
  // });
  // ```
  node.resolveHome = function () {
    // arguments Array 로 변환.
    var args = Array.prototype.slice.call(arguments);
    args.splice(0, 0, process.env.HOME || process.env.USERPROFILE)
    return path.resolve.apply(path, args)
  }

  // ##### 최상위 부터 순차적으로 디렉토리를 만들 수 있다.
  //
  // ```js
  // waitsForPromise(function () {
  //   return $4._constructDir(path.resolve(__dirname, 'foo/bar'))
  //   .then(function () {
  //     return _exists(path.resolve(__dirname, 'foo/bar'));
  //   }).then(function (exists) {
  //     expect(exists).toBeTruthy();
  //   });
  // });
  // ```
  node._constructDir = function (dirPath) {
    var _exists = $4.makePromise(fs.exists, false);
    var _mkdir = $4.makePromise(fs.mkdir);
    var dirNames = path.resolve(dirPath).split(path.sep);
    var pp = path.sep;

    return dirNames.reduce(function (_promise, dir) {
      pp = path.join(pp, dir);
      var ppp = pp;
      return _promise.then(function () {
        return _exists(ppp);
      }).then(function (exists) {
        if(!exists) return _mkdir(ppp);
      });
    }, Promise.resolve());
  };


  // ##### 원격지에서 data를 가져올 수 있다.
  //
  // ```js
  // waitsForPromise(function () {
  //   return $4._getRemoteData('https://raw.githubusercontent.com/bynaki/atom.bynote/v0.3/spec/dmp01.txt')
  //   .then(function (data) {
  //     expect(data.toString()).toEqual('Hello World!!\n');
  //   });
  // });
  // ```
  node._getRemoteData = function (uri) {
    var get = null;
    var protocol = url.parse(uri).protocol;

    if(protocol === 'http:') {
      get = require('http').get;
    } else if(protocol === 'https:') {
      get = require('https').get;
    } else {
      return Promise.reject(Error('have to http: or https:.'));
    }

    return new Promise(function (resolve, reject) {
      var chunks = [];
      get(uri, function (res) {
        res.on('data', function (chunk) {
          chunks.push(chunk);
        });
        res.on('end', function () {
          resolve(node.mergeBuffers.apply(node, chunks));
        });
      }).on('error', function (e) {
        reject(e);
      });
    });
  };


  // ##### 원격지의 파일을 다운로드한다.
  //
  // ```js
  // waitsForPromise(function () {
  //   return $4._download(uri, filename)
  //   .then(function () {
  //     return _exists(filename);
  //   }).then(function (exists) {
  //     expect(exists).toBeTruthy(); // clever!
  //   });
  // });
  // ```
  node._download = function (uri, filename) {
    var get = null;
    var protocol = url.parse(uri).protocol;
    if(protocol === 'http:') {
      get = require('http').get;
    } else if(protocol === 'https:') {
      get = require('https').get;
    } else {
      return Promise.reject(Error('have to http: or https: ' + uri));
    }

    return new Promise(function (resolve, reject) {
      var fileStream = fs.createWriteStream(filename)
        .on('error', reject);
      var request = get(uri, function (res) {
        res.on('end', resolve);
        res.pipe(fileStream);
      });
      request.on('error', reject);
    });
  };


  // ##### 원격지의 파일을 다운로드한다.
  //
  // ```js
  // waitsForPromise(function () {
  //   return $4._download2(uri, filename)
  //   .then(function () {
  //     return _exists(filename);
  //   }).then(function (exists) {
  //     expect(exists).toBeTruthy();
  //   });
  // });
  // ```
  node._download2 = function (uri, filename) {
    return node._getRemoteData(uri)
    .then(function (data) {
      var _writeFile = $4.makePromise(fs.writeFile);
      return _writeFile(filename, data);
    });
  };


  return node;
};




var unique = function () {
  var unique = {};

  unique.sha1 = function(str) {
    //  discuss at: http://phpjs.org/functions/sha1/
    // original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // improved by: Michael White (http://getsprink.com)
    // improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
    //    input by: Brett Zamir (http://brett-zamir.me)
    //   example 1: sha1('Kevin van Zonneveld');
    //   returns 1: '54916d2e62f65b3afa6e192e6a601cdbe5cb5897'

    var rotate_left = function(n, s) {
      var t4 = (n << s) | (n >>> (32 - s));
      return t4;
    };

    /*var lsb_hex = function (val) {
     // Not in use; needed?
      var str="";
      var i;
      var vh;
      var vl;

      for ( i=0; i<=6; i+=2 ) {
        vh = (val>>>(i*4+4))&0x0f;
        vl = (val>>>(i*4))&0x0f;
        str += vh.toString(16) + vl.toString(16);
      }
      return str;
    };*/

    var cvt_hex = function(val) {
      var str = '';
      var i;
      var v;

      for (i = 7; i >= 0; i--) {
        v = (val >>> (i * 4)) & 0x0f;
        str += v.toString(16);
      }
      return str;
    };

    var blockstart;
    var i, j;
    var W = new Array(80);
    var H0 = 0x67452301;
    var H1 = 0xEFCDAB89;
    var H2 = 0x98BADCFE;
    var H3 = 0x10325476;
    var H4 = 0xC3D2E1F0;
    var A, B, C, D, E;
    var temp;

    // utf8_encode
    str = unescape(encodeURIComponent(str));
    var str_len = str.length;

    var word_array = [];
    for (i = 0; i < str_len - 3; i += 4) {
      j = str.charCodeAt(i) << 24 | str.charCodeAt(i + 1) << 16 | str.charCodeAt(i + 2) << 8 | str.charCodeAt(i + 3);
      word_array.push(j);
    }

    switch (str_len % 4) {
    case 0:
      i = 0x080000000;
      break;
    case 1:
      i = str.charCodeAt(str_len - 1) << 24 | 0x0800000;
      break;
    case 2:
      i = str.charCodeAt(str_len - 2) << 24 | str.charCodeAt(str_len - 1) << 16 | 0x08000;
      break;
    case 3:
      i = str.charCodeAt(str_len - 3) << 24 | str.charCodeAt(str_len - 2) << 16 | str.charCodeAt(str_len - 1) <<
        8 | 0x80;
      break;
    }

    word_array.push(i);

    while ((word_array.length % 16) != 14) {
      word_array.push(0);
    }

    word_array.push(str_len >>> 29);
    word_array.push((str_len << 3) & 0x0ffffffff);

    for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
      for (i = 0; i < 16; i++) {
        W[i] = word_array[blockstart + i];
      }
      for (i = 16; i <= 79; i++) {
        W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1);
      }

      A = H0;
      B = H1;
      C = H2;
      D = H3;
      E = H4;

      for (i = 0; i <= 19; i++) {
        temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      for (i = 20; i <= 39; i++) {
        temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      for (i = 40; i <= 59; i++) {
        temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      for (i = 60; i <= 79; i++) {
        temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0ffffffff;
        E = D;
        D = C;
        C = rotate_left(B, 30);
        B = A;
        A = temp;
      }

      H0 = (H0 + A) & 0x0ffffffff;
      H1 = (H1 + B) & 0x0ffffffff;
      H2 = (H2 + C) & 0x0ffffffff;
      H3 = (H3 + D) & 0x0ffffffff;
      H4 = (H4 + E) & 0x0ffffffff;
    }

    temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4);
    return temp.toLowerCase();
  };


  unique.randomID = function(radix) {
    return Math.random().toString(radix).substr(2, 100);
  };


  unique.timeNow = function(radix) {
    return Date.now().toString(radix);
  };

  return unique;
};



$4.unique = unique();
$4.extend($4, $4.unique);

if(typeof module === 'object' && typeof module.exports === 'object') { // CommonJS
  $4.node = node();
  $4.extend($4, $4.node);
  module.exports = $4;
} else if(typeof define === 'function' && define.amd) {                // AMD
  define([], function() { return $4; });
} else if(typeof window !== 'undefined') {                             // Browser
  window.$4 = $4;
} else {
  throw Error('sh1 requires a CommonJS or a AMD or a window.');
}


})();
