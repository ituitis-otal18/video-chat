//Socket
const socket = io('/');
/*
const peer = new Peer(undefined, {
    host: 'localhost',
    path: '/peerjs',
    port: 3000
});
*/

const peer = new Peer(undefined, {
    secure: true, 
    host: 'video-chat-v1.herokuapp.com',
    path: '/peerjs',
    port: 443
});


const peers = {}
let allUsers = [];

//Socket
socket.on('connect', () => {
    peer.on('open', id => {
        socket.emit('join', roomID, id);
    })
});

socket.on('all-users', users => {
    allUsers = users;
})

socket.on('user-left', userID => {
    if (peers[userID]){
        peers[userID].close();
        peers[userID] = null;
    } 
})

//Create own Video
const videoGrid = document.getElementById("video-grid");
const myVideo = document.getElementById("myVideo");
myVideo.muted = true;

navigator.getUserMedia(
    { video: true, audio: true },
    stream => { 
        addVideoStream(myVideo, stream);

        //Get video stream
        peer.on('call', call => {
            call.answer(stream)
            const video = document.createElement('video')
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream);
            })
            call.on('close', () => {
                video.remove();
                console.log("user left: "+userID);
            })
        })

        //Send video stream
        socket.on('user-joined', (userID) => {
            connectToUser(userID, stream);
        })
    },
    error => { console.warn(error.message) }
);

function connectToUser(userID, stream){
    const call = peer.call(userID, stream);

    const video = document.createElement("video");
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    })
    call.on('close', () => {
        video.remove();
        console.log("user left: "+userID);
    })
    peers[userID] = call;
}

function addVideoStream(video, stream){
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoGrid.append(video);
}

//Chat
function sendMessage(){
    let msgElement = document.getElementById("message");
    let msg = userName + ": " + msgElement.value;
    msgElement.value = "";
    socket.emit('new-message', msg);
}

socket.on('chat-update', chat => {
    let area = document.getElementById("chat");
    area.innerHTML = "";
    let br = document.createElement("br");

    chat.forEach(msg => {
        let p = document.createElement("p");
        p.innerHTML = msg;
        area.append(p);
        area.append(br);
    });
})

//Share URL
function copyURL(){
    var chatLink = document.getElementById("chat-link");
    chatLink.value = window.location.origin + "/room/" + roomID;

    chatLink.select();
    chatLink.setSelectionRange(0, 99999);
    document.execCommand("copy");
}