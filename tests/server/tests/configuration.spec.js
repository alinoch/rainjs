// Copyright © 2012 rainjs
//
// All rights reserved
//
// Redistribution and use in source and binary forms, with or without modification, are permitted
// provided that the following conditions are met:
//
//    1. Redistributions of source code must retain the above copyright notice, this list of
//       conditions and the following disclaimer.
//    2. Redistributions in binary form must reproduce the above copyright notice, this list of
//       conditions and the following disclaimer in the documentation and/or other materials
//       provided with the distribution.
//    3. Neither the name of The author nor the names of its contributors may be used to endorse or
//       promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE AUTHOR AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR
// IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
// SHALL THE AUTHOR AND CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS;
// OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
// WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
// IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

"use strict";

var cwd = process.cwd();
var path = require('path');
var globals = require(cwd + '/lib/globals');

var configurationsFolder = cwd + '/tests/server/fixtures/';

describe('Server configuration and validation', function () {

    /**
     * Use a specific configuration file for the server.
     *
     * @param {String} configPath the configuration file path
     */
    function loadConfiguration(configPath) {
        var mockConfiguration = loadModuleContext('/lib/configuration.js', {
            'commander': {
                'conf': configPath
            }
        });
        return new mockConfiguration.Configuration();
    }

    it('must set the language to the default one', function () {
        var configuration = loadConfiguration(configurationsFolder + 'server_two.conf');
        expect(configuration.language).toBe('en_US');
    });

    it('must set the language to the one specified in the configuration', function () {
        var configuration = loadConfiguration();
        expect(configuration.language).toBe('ro_RO');
    });

    it('must throw an error when language is missing', function () {
        expect(function () {
            loadConfiguration(configurationsFolder + 'server_three.conf');
        }).toThrowType(RainError.ERROR_PRECONDITION_FAILED);
    });

});
