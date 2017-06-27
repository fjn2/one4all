# one4all
This is the ultimate audio sync player. You can use your computers, mobiles or tablets to reproduce your amazing music in any place that you want.

You can play audios from YouTube!!!

You can find this proyect up and running in this here!

http://52.39.167.139/

We know that there is a lot to work to do but we are putting our best. (Especially in the design)

You can choose as input for the music mp3 audios (online)  or links from YouTube

You can also create rooms for you `/room/ROOM_NAME` to have more privacity with your friends



## Server

#### Configuration

It is needed to create a *configuration.json* file at the root of the project

```bash
touch configuration.json
```

With this content as an example:

```json
{
	"host": "localhost",
	"port": "2000",
	"debug": "silly",
    "spinnerPort": "2003"
}
```

To run the server

```shell
cd server/
node spinner.js
```



## Client

It is needed to create a *configuration.js* file in the client folder

```bash
touch client/configuration.js
```

With this content:

```javascript
const configuration = {
  server: 'localhost:2000',
  spinner: 'localhost:2003',
  maxDetour: 30,
};
```

If you want to change the port, you also must to change the file *serve.js* inside the *client* folder

To run the client

```bash
cd client/
node serve.js
```



## Disclaimer

If you have problems, suggestions or whatever that you want to say, just send me a message.

### TODO

- Integrate music with spotify / etc
- Kill rooms when there is no people inside
- Select an administrator of the room