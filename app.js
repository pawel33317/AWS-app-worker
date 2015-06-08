var AWS = require("aws-sdk");
var os = require("os");
var crypto = require('crypto');
var fs = require('fs');
//zawiera funkcje pomocnicze generowania skrótów robienia z jonson obiektu ...
var helpers = require("./helpers");
//accessKeyId ... klucze do amazona 
AWS.config.loadFromPath('./config.json');
//obiekt dla instancji S3 z aws-sdk
var s3 = new AWS.S3();
//plik z linkiem do kolejki
var APP_CONFIG_FILE = "./app.json";
//dane o kolejce wyciągamy z tablicy i potrzebny link przypisujemy do linkKolejki
var tablicaKolejki = helpers.readJSONFile(APP_CONFIG_FILE);
var linkKolejki = tablicaKolejki.QueueUrl
//obiekt kolejki z aws-sdk
var sqs=new AWS.SQS();

//obiekt do obsługi simple DB z aws-sdk
var simpledb = new AWS.SimpleDB();

//GraphicsMagic
var gm = require('gm');
//funkcja - petla wykonuje sie caly czas
var myServer = function(){
	
	//parametr do funkcji pobierającej wiadomość z kolejki
	var params = {
		QueueUrl: linkKolejki,
		AttributeNames: ['All'],
		MaxNumberOfMessages: 1,
		MessageAttributeNames: ['key','bucket'],
		VisibilityTimeout: 10,//na tyle sec nie widac jej w kolejce
		WaitTimeSeconds: 0//to na 0 
	};
	
	//odbiera wiadomość
	sqs.receiveMessage(params, function(err, data) {
	if (err) {
		console.log(err, err.stack); // an error occurred
	}
	else {
		//console.log(JSON.stringify(data, null, 4));
		
		//Czy jest jakaś wiadomość
		if(!data.Messages) {
			console.log("No message in queue.");
		} else {
			
			//pobranie danych z body wiadomosci w kolejce i zrobienie z nich tablicy
			//handler do ussunięcia wiadomości z kolejki
			var ReceiptHandle_forDelete = data.Messages[0].ReceiptHandle;
			//{bucket, key}
			var messageinfo = JSON.parse(data.Messages[0].Body);
			console.log("Otrzymano wiadomosc: bucket - "+messageinfo.bucket+", key - "+messageinfo.key);
			
			//to samo co wyzej tylko pobiera dane z metadanych a nie z body
			//var messageinfo = { "bucket":data.Messages[0].MessageAttributes.bucket.StringValue,"key":data.Messages[0].MessageAttributes.key.StringValue}console.log(messageinfo.bucket);
				
			//parametry do pobrania pliku (obiektu)
			var params2 = {
				Bucket: messageinfo.bucket,
				Key: messageinfo.key
			};
			
			
			
			var file = require('fs').createWriteStream('tmp/'+messageinfo.key.substring(10));
			var requestt = s3.getObject(params2).createReadStream().pipe(file);
				
			requestt.on('finish', function (){
					console.log('jestem tu po zapisaniu pliku na dysk');
				}
			);
			
			
			//pobieramy plik (obiekt) i dane o nim
			/*s3.getObject(params2, function(err, tekenFile) {
			if (err) {
				console.log(err, err.stack);
			}
			else {
				
				console.log("Plik zaladowany poprawnie.");
				
				//strumień pliku
				//console.log(tekenFile.Body);
				
				//wrzuca przerobiony plik do processed
				var paramsu = {
					Bucket: messageinfo.bucket,
					Key: 'processed/'+messageinfo.key.substring(10),
					ACL: 'public-read',
					Body: tekenFile.Body,
				};
				s3.putObject(paramsu, function(err, datau) {
				if (err) {
					console.log(err, err.stack);
				}
				else {   
					console.log(datau);
					console.log('zuploadowano');
				}
				});
			}
			});
				*/
				
				
				
				//Wyliczenie skrótu czyki sumy kontrolnej dla pliku 
				//var algorithms = ['sha1', 'md5', 'sha256', 'sha512']
				//var loopCount = 1;
				//var doc = tekenFile.Body;
				//helpers.calculateMultiDigest(doc, algorithms, function(err, digests) {
				//	console.log(digests);
				//}, loopCount);
	
	/*
	var paramsdb = {
		Attributes: [
			{ Name: messageinfo.key, Value: JSON.stringify(digests), Replace: true}
		],
		DomainName: "czubakd1", 
		ItemName: 'ITEM001'
	};
	simpledb.putAttributes(paramsdb, function(err, datass) {
		if (err) {
			console.log('Blad zapisu do bazy'+err, err.stack);
		}
		else {
			console.log("Zapisano do bazy");
			//usuwanie wiadomosci z kolejki
			var params = {
			  QueueUrl: linkKolejki,
			  ReceiptHandle: ReceiptHandle_forDelete
			};
			sqs.deleteMessage(params, function(err, data) {
			  if (err) console.log(err, err.stack); // an error occurred
			  else     console.log("Usunieto wiadomosc z kolejki: "+data);           // successful response
			});
		}
	});
	*/
		
		}
	}
	});
	setTimeout(myServer, 5000);
}

//odpalamy petle
myServer();