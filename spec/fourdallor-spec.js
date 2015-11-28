// ## fourdollar.js test



var $4 = require('../fourdollar');
var fs = require('fs');
var path = require('path');
var process = require('process');

describe('fourdollar:', function () {
  describe('makePromise():', function () {
    var _readFile = $4.makePromise(fs.readFile);

    it('fs.readFile를 Promise로 변경할 수 있다', function () {
      var thenCallback = jasmine.createSpy();
      var catchCallback = jasmine.createSpy();

      waitsForPromise(function () {
        return _readFile(path.resolve(__dirname, '../resource/dmp01.txt'))
        .then(thenCallback)
        .catch(catchCallback);
      });

      runs(function () {
        expect(thenCallback).toHaveBeenCalled();
        expect(catchCallback).not.toHaveBeenCalled();
      });
    });


    it('catch도 올바르게 수행된다.', function () {
      var thenCallback = jasmine.createSpy();
      var catchCallback = jasmine.createSpy();

      waitsForPromise(function () {
        return _readFile('sdlkfjsdlkfj.txt')
        .then(thenCallback)
        .catch(catchCallback);
      });

      runs(function () {
        expect(thenCallback).not.toHaveBeenCalled();
        expect(catchCallback).toHaveBeenCalled();
      });
    });


    it('then 인수도 전달받는다.', function () {
      waitsForPromise(function () {
        return _readFile(path.resolve(__dirname, '../resource/dmp01.txt'), {encoding: 'utf-8'})
        .then(function (data) {
          expect(data).toEqual('Hello World!!\n');
        });
      });
    });


    it('catch error 인수도 전달받는다.', function () {
      waitsForPromise(function () {
        return _readFile('sdlfhsldfjlsd.txt')
        .catch(function (err) {
          expect(err).toBeDefined();
        });
      });
    });


    it('error 인수가 없는 비동기도 잘 동작한다.', function () {
      var _exists = $4.makePromise(fs.exists, false);
      waitsForPromise(function () {
        return _exists('dsaldjfljds.txt')
        .then(function (exists) {
          expect(exists).toEqual(false);
        });
      });
    });
  });


  describe('extend()', function () {
    it('객체를 확장할 수 있다.', function () {
      var objA = {hello: 'hello', world: 'world'};
      var objB = {foo: 'foo', bar: 'bar'};
      var extendedObj = $4.extend(objA, objB);
      expect(extendedObj.foo).toEqual('foo');
      expect(extendedObj.bar).toEqual('bar');
      expect(objA.foo).toEqual('foo');
      expect(objA.bar).toEqual('bar');
    });
  });



  describe('node.mergeBuffers():', function () {
    var buf1 = new Buffer('foo');
    var buf2 = new Buffer('bar');
    var buf3 = new Buffer('!!');

    it('버퍼들을 하나로 합친다.', function () {
      var merge = $4.mergeBuffers(buf1, buf2, buf3);
      expect(merge.toString()).toEqual('foobar!!');
    });

    it('정말로 버퍼이다.', function () {
      var merge = $4.mergeBuffers(buf1, buf2, buf3);
      expect(merge instanceof Buffer).toBeTruthy();
    });
  });


  describe('node.resolveHome():', function () {
    var homeDir = process.env.HOME || process.env.USERPROFILE;

    it('홈디렉토리가 기준이다.', function () {
      expect($4.resolveHome()).toEqual(homeDir);
    });

    it('홈디렉토리로 시작하는 path.resolve와 같아야 한다.', function () {
      expect($4.resolveHome('foo', 'bar'))
        .toEqual(path.resolve(homeDir, 'foo', 'bar'));
    });
  });


  describe('node._constructDir():', function () {
    it('최상위 부터 순차적으로 디렉토리를 만들수 있다.', function () {
      var _rmdir = $4.makePromise(fs.rmdir);
      var _exists = $4.makePromise(fs.exists, false);

      waitsForPromise(function () {
        return _exists(path.resolve(__dirname, '../tmp/foo/bar'))
        .then(function (exists) {
          if(exists) {
            return _rmdir(path.resolve(__dirname, '../tmp/foo/bar'));
          }
        }).then(function () {
          return _exists(path.resolve(__dirname, '../tmp/foo'));
        }).then(function (exists) {
          if(exists) {
            return _rmdir(path.resolve(__dirname, '../tmp/foo'));
          }
        });
      });

      waitsForPromise(function () {
        return $4._constructDir(path.resolve(__dirname, '../tmp/foo/bar'))
        .then(function () {
          return _exists(path.resolve(__dirname, '../tmp/foo/bar'));
        }).then(function (exists) {
          expect(exists).toBeTruthy();
        });
      });
    });
  });


  describe('node._getRemoteData():', function () {
    it('원격지에서 data를 가져올 수 있다.', function () {
      waitsForPromise(function () {
        return $4._getRemoteData('https://raw.githubusercontent.com/bynaki/fourdollar.js/v0.1/resource/dmp01.txt')
        .then(function (data) {
          expect(data.toString()).toEqual('Hello World!!\n');
        });
      });
    });

    it('http:, https: 만 허용된다.', function () {
      var catchCallback = jasmine.createSpy();

      waitsForPromise(function () {
        return $4._getRemoteData('www.naver.com')
        .catch(catchCallback);
      });

      runs(function () {
        expect(catchCallback).toHaveBeenCalled();
      });
    });
  });


  describe('node._download', function () {
    var uri = 'https://raw.githubusercontent.com/bynaki/fourdollar.js/v0.1/resource/ironman.jpg';
    var filename = path.resolve(__dirname, '../tmp/ironman.jpg');

    it('원격지의 파일을 다운로드한다.', function () {
      var _exists = $4.makePromise(fs.exists, false);
      var _unlink = $4.makePromise(fs.unlink);

      waitsForPromise(function () {
        return _exists(filename)
        .then(function (exists) {
          if(exists) {
            return _unlink(filename);
          }
        });
      });

      waitsForPromise(function () {
        return $4._download(uri, filename)
        .then(function () {
          return _exists(filename);
        }).then(function (exists) {
          expect(exists).toBeTruthy();
        });
      });
    });

    it('http:, https: 만 허용된다.', function () {
      var catchCallback = jasmine.createSpy();

      waitsForPromise(function () {
        return $4._download2('www.naver.com', filename)
        .catch(catchCallback);
      });

      runs(function () {
        expect(catchCallback).toHaveBeenCalled();
      });
    });
  });


  describe('node._download2', function () {
    var uri = 'https://raw.githubusercontent.com/bynaki/fourdollar.js/v0.1/resource/ironman.jpg';
    var filename = path.resolve(__dirname, '../tmp/ironman.jpg');

    it('원격지의 파일을 다운로드한다.', function () {
      var _exists = $4.makePromise(fs.exists, false);
      var _unlink = $4.makePromise(fs.unlink);

      waitsForPromise(function () {
        return _exists(filename)
        .then(function (exists) {
          if(exists) {
            return _unlink(filename);
          }
        });
      });

      waitsForPromise(function () {
        return $4._download2(uri, filename)
        .then(function () {
          return _exists(filename);
        }).then(function (exists) {
          expect(exists).toBeTruthy();
        });
      });
    });

    it('http:, https: 만 허용된다.', function () {
      var catchCallback = jasmine.createSpy();

      waitsForPromise(function () {
        return $4._download2('www.naver.com', filename)
        .catch(catchCallback);
      });

      runs(function () {
        expect(catchCallback).toHaveBeenCalled();
      });
    });
  });
});
