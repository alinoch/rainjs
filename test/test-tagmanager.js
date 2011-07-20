var nodeunit = require('nodeunit')
	,tagmanager = require('../lib/tagmanager.js');

module.exports = nodeunit.testCase({
	setUp : function (callback) {
		var taglib = this.taglib = [
		  {
		    namespace : ''
		    ,selector : 'app[type=weather]'
		    ,module : 'Weather'
		  }
		  ,{
		    namespace : 'http://test.de'
		    ,selector : 'header'
		    ,module : 'Header'
		  }
		  ,{
		  	namespace : 'http://test.de'
		  	,selector : 'header[a=b]'
		  	,module	  : ''
		  }
		];
		tagmanager.setTagList(taglib);	
		callback();
	}

	, testBasic : function (test) {
		test.equals(tagmanager.getTag('foobar', [], null, null, null), null);
		test.equals(tagmanager.getTag('header', [], null, 'http://test.de', []), this.taglib[1]);
		test.equals(tagmanager.getTag('header', [], null, 'http://wrong', []), null);
		test.done();
	}

	// ,testPrecedence : function (test) {
	// 	test.equals(tagmanager.getTag('header', [['a', 'b']], null, 'http://test.de', []), this.taglib[2]);
	// 	test.done();
	// }
});