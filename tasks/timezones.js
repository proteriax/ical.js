const util = require('util');
const path = require('path');
const child_process = require('child_process');

const OLSON_DB_REMOTE = 'http://www.iana.org/time-zones/repository/releases/tzdata%s.tar.gz';
const TZURL_DIR = process.env.TZURL_DIR || path.join(__dirname, '..', 'tools', 'tzurl');
const OLSON_DIR = process.env.OLSON_DIR || path.join(TZURL_DIR, 'olson');

module.exports = function(grunt) {
  grunt.registerTask('timezones', 'Get Olson timezone data', function() {
    var olsonversion = grunt.option('olsondb');
    if (!olsonversion) {
      olsonversion = (new Date()).getFullYear() + "a";
      grunt.fail.warn('Need to specify --olsondb=<version>, e.g. ' + olsonversion);
      return;
    }

    if (grunt.file.isDir(TZURL_DIR)) {
      grunt.log.ok('Using existing tzurl installation');
    } else {
      grunt.log.ok('Retrieving tzurl from svn');
      child_process.execSync('svn export -r40 http://tzurl.googlecode.com/svn/trunk/ ' + TZURL_DIR);
    }

    if (grunt.file.isDir(OLSON_DIR)) {
      grunt.log.ok('Using olson database from ' + OLSON_DIR);
    } else {
      var url = util.format(OLSON_DB_REMOTE, olsonversion);
      grunt.log.ok('Downloading ' + url);
      grunt.file.mkdir(OLSON_DIR);
      child_process.execSync('wget ' + url + ' -O - | tar xz -C ' + OLSON_DIR);
    }

    grunt.log.ok('Building tzurl tool');
    child_process.execSync('make -C "' + TZURL_DIR + '" OLSON_DIR="' + OLSON_DIR + '"');

    grunt.log.ok('Running vzic');
    child_process.execSync(path.join(TZURL_DIR, 'vzic'));
  });
};
