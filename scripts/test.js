var request = require('supertest');
var app = require('../server.js');

describe('GET /', function() {
  it('loads page', function(done) {
    request(app).get('/').expect(200, done);
  });
});
