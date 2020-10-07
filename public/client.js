//Socket
const socket = io('/');
const peer = new Peer(undefined, {
    secure: true, 
    host: 'https://video-chat-v1.herokuapp.com/',
    port: 443,
    path:'/peer'
});

const peers = {}
let allUsers = [];
let otherUsers = [];

//Create own Video
const videoGrid = document.getElementById("video-grid");
const myVideo = document.getElementById("myVideo");
myVideo.muted = true;

navigator.getUserMedia(
    { video: true, audio: true },
    stream => { 
        addVideoStream(myVideo, stream);

        peer.on('call', call => {
            call.answer(stream)

            //Send video stream
            const video = document.createElement('video')
            call.on('stream', userVideoStream => {
                addVideoStream(video, userVideoStream)
            })
            call.on('close', () => {
                video.remove();
            })
        })

        socket.on('user-joined', (userID) => {
            otherUsers.push(userID);
            connectToUser(userID, stream);
        })
    },
    error => { console.warn(error.message) }
);

//Socket
socket.on('connect', () => {
    peer.on('open', id => {
        socket.emit('join', roomID, id);
    })
});

socket.on('all-users', users => {
    allUsers = users;
})

socket.on('user-disconnected', userID => {
    if (peers[userID]) peers[userID].close();
})

function connectToUser(userID, stream){
    const call = peer.call(userID, stream);

    //Get video stream
    const video = document.createElement("video");
    call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream);
    })
    call.on('close', () => {
        video.remove();
    })
    peers[userID] = call
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
    let msg = userName + ": " + document.getElementById("message").value;
    socket.emit('new-message', roomID, msg);
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
    console.log(chat);
})

function copyURL(){
    var chatLink = document.getElementById("chat-link");
    chatLink.value = window.location.origin + "/room/" + roomID;

    chatLink.select();
    chatLink.setSelectionRange(0, 99999);
    document.execCommand("copy");
}