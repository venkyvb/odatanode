var config = require('./config');
var o = require('odata');
var fs = require('fs');
var os = require('os');
var Q = require('q');
var qlimit = require('qlimit');
var limit = qlimit(5);

o().config({
  username: config.credentials.username,
  password: config.credentials.password,
  format: config.odata.format
});

function processNextPage(ticketUrl, interactionUrl) {
  var oHandler = o(ticketUrl);
  oHandler.get(function(data) {
    var interactionRequests = data.d.results.map(function(value) {
      return o(interactionUrl + "'" + value.ObjectID + "'").get();
    });

    var next = data.d.__next;

    Q.all(interactionRequests)
      .then(function(interactionResponses) {
        interactionResponses.forEach(function(responseEntry) {
          var interactionEntries = responseEntry.data.d.results.map(function(
            value
          ) {
            var interactionEntry = {};
            interactionEntry.interactionType = value.InteractionType;
            interactionEntry.serviceRequestObjectID =
              value.ServiceRequestObjectID;
            interactionEntry.interactionUuid = value.InteractionUUID;

            return interactionEntry;
          });

          var home = require('os').homedir();
          writeToFile(
            home + '/Documents/tickets_interactions.csv',
            interactionEntries
          );
          return interactionEntries;
        });
        processNextPage(next, interactionUrl);
      })
      .catch(function(error) {
        console.log(error);
      });

    console.log(next);
  });
}

function writeToFile(fileName, interactionEntries) {
  var file = fs.createWriteStream(fileName, { flags: 'a' });
  file.on('error', function(err) {
    console.log(error);
  });
  interactionEntries.forEach(function(v) {
    file.write(
      v.serviceRequestObjectID +
        ', ' +
        v.interactionUuid +
        ', ' +
        v.interactionType +
        '\n'
    );
  });
  file.end();
}

processNextPage(config.ticketUrl, config.interactionsUrl);
