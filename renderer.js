const { ipcRenderer } = require('electron');
const path = require('path');

let videoPlaylist = [];
let musicPlaylist = [];
let currentVideoIndex = 0;
let currentMusicIndex = 0;
let currentPlaylistType = 'video';
let selectedMergeVideo = null;
let selectedMergeAudio = null;
let videoDuration = 0;

// Lấy các elements
const videoPlayer = document.getElementById('videoPlayer');
const audioPlayer = document.getElementById('audioPlayer');
const selectVideoButton = document.getElementById('selectVideos');
const selectMusicButton = document.getElementById('selectMusic');
const playlistContainer = document.getElementById('playlist');
const videoWrapper = document.getElementById('videoWrapper');
const audioWrapper = document.getElementById('audioWrapper');
const currentTrack = document.getElementById('currentTrack');
const prevTrack = document.getElementById('prevTrack');
const playPause = document.getElementById('playPause');
const nextTrack = document.getElementById('nextTrack');
const tabButtons = document.querySelectorAll('.tab-btn');
const selectMergeVideoBtn = document.getElementById('selectMergeVideo');
const selectMergeAudioBtn = document.getElementById('selectMergeAudio');
const mergeButton = document.getElementById('mergeButton');
const selectedVideoSpan = document.getElementById('selectedVideo');
const selectedAudioSpan = document.getElementById('selectedAudio');
const mergeStatus = document.getElementById('mergeStatus');
const loopCountInput = document.getElementById('loopCount');
const estimatedDuration = document.getElementById('estimatedDuration');

// Xử lý tabs
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentPlaylistType = button.dataset.type;
        updatePlaylist();
        toggleMediaPlayer();
    });
});

// Xử lý chọn video
selectVideoButton.addEventListener('click', async () => {
    const files = await ipcRenderer.invoke('open-file-dialog', 'video');
    if (files) {
        videoPlaylist = files.map(file => ({
            path: file,
            name: path.basename(file)
        }));
        currentPlaylistType = 'video';
        updatePlaylist();
        if (videoPlaylist.length > 0) {
            playVideo(0);
        }
    }
});

// Xử lý chọn nhạc
selectMusicButton.addEventListener('click', async () => {
    const files = await ipcRenderer.invoke('open-file-dialog', 'music');
    if (files) {
        musicPlaylist = files.map(file => ({
            path: file,
            name: path.basename(file)
        }));
        currentPlaylistType = 'music';
        updatePlaylist();
        if (musicPlaylist.length > 0) {
            playMusic(0);
        }
    }
});

// Xử lý chọn video để ghép
selectMergeVideoBtn.addEventListener('click', async () => {
    const files = await ipcRenderer.invoke('open-file-dialog', 'video');
    if (files && files.length > 0) {
        selectedMergeVideo = files[0];
        selectedVideoSpan.textContent = path.basename(files[0]);
        
        // Lấy thời lượng video
        try {
            videoDuration = await ipcRenderer.invoke('get-video-duration', files[0]);
            updateEstimatedDuration();
        } catch (error) {
            console.error('Không thể lấy thời lượng video:', error);
        }
        
        updateMergeButton();
    }
});

// Xử lý chọn nhạc để ghép
selectMergeAudioBtn.addEventListener('click', async () => {
    const files = await ipcRenderer.invoke('open-file-dialog', 'music');
    if (files && files.length > 0) {
        selectedMergeAudio = files[0];
        selectedAudioSpan.textContent = path.basename(files[0]);
        updateMergeButton();
    }
});

// Cập nhật trạng thái nút ghép
function updateMergeButton() {
    mergeButton.disabled = !(selectedMergeVideo && selectedMergeAudio);
}

// Xử lý sự kiện ghép media
mergeButton.addEventListener('click', async () => {
    try {
        mergeStatus.className = 'merge-status';
        mergeStatus.textContent = 'Đang xử lý...';
        mergeStatus.style.display = 'block';

        const outputPath = await ipcRenderer.invoke('save-file-dialog');
        if (!outputPath) return;

        const loopCount = parseInt(loopCountInput.value) || 1;

        const result = await ipcRenderer.invoke('merge-media-with-loop', {
            videoPath: selectedMergeVideo,
            audioPath: selectedMergeAudio,
            outputPath: outputPath,
            loopCount: loopCount
        });

        mergeStatus.textContent = result.message;
        mergeStatus.className = 'merge-status success';

        // Reset selection
        selectedMergeVideo = null;
        selectedMergeAudio = null;
        selectedVideoSpan.textContent = 'Chưa chọn video';
        selectedAudioSpan.textContent = 'Chưa chọn nhạc';
        videoDuration = 0;
        loopCountInput.value = 1;
        estimatedDuration.textContent = '0:00';
        updateMergeButton();

    } catch (error) {
        mergeStatus.textContent = error.message;
        mergeStatus.className = 'merge-status error';
    }
});

// Cập nhật giao diện playlist
function updatePlaylist() {
    playlistContainer.innerHTML = '';
    const playlist = currentPlaylistType === 'video' ? videoPlaylist : musicPlaylist;
    const currentIndex = currentPlaylistType === 'video' ? currentVideoIndex : currentMusicIndex;

    playlist.forEach((item, index) => {
        const element = document.createElement('div');
        element.className = `playlist-item ${index === currentIndex ? 'active' : ''}`;
        element.textContent = item.name;
        element.onclick = () => {
            if (currentPlaylistType === 'video') {
                playVideo(index);
            } else {
                playMusic(index);
            }
        };
        playlistContainer.appendChild(element);
    });
}

// Chuyển đổi giữa video và audio player
function toggleMediaPlayer() {
    if (currentPlaylistType === 'video') {
        videoWrapper.style.display = 'block';
        audioWrapper.style.display = 'none';
    } else {
        videoWrapper.style.display = 'none';
        audioWrapper.style.display = 'block';
    }
}

// Phát video
function playVideo(index) {
    if (index >= 0 && index < videoPlaylist.length) {
        currentVideoIndex = index;
        videoPlayer.src = videoPlaylist[index].path;
        videoPlayer.play();
        updatePlaylist();
    }
}

// Phát nhạc
function playMusic(index) {
    if (index >= 0 && index < musicPlaylist.length) {
        currentMusicIndex = index;
        audioPlayer.src = musicPlaylist[index].path;
        audioPlayer.play();
        currentTrack.textContent = musicPlaylist[index].name;
        updatePlaylist();
    }
}

// Xử lý các nút điều khiển nhạc
prevTrack.addEventListener('click', () => {
    if (currentMusicIndex > 0) {
        playMusic(currentMusicIndex - 1);
    }
});

nextTrack.addEventListener('click', () => {
    if (currentMusicIndex < musicPlaylist.length - 1) {
        playMusic(currentMusicIndex + 1);
    }
});

playPause.addEventListener('click', () => {
    if (audioPlayer.paused) {
        audioPlayer.play();
    } else {
        audioPlayer.pause();
    }
});

// Xử lý khi media kết thúc
videoPlayer.addEventListener('ended', () => {
    if (currentVideoIndex < videoPlaylist.length - 1) {
        playVideo(currentVideoIndex + 1);
    }
});

audioPlayer.addEventListener('ended', () => {
    if (currentMusicIndex < musicPlaylist.length - 1) {
        playMusic(currentMusicIndex + 1);
    }
});

// Hàm format thời gian
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Thêm sự kiện cho input số lần lặp
loopCountInput.addEventListener('input', updateEstimatedDuration);

// Hàm cập nhật thời lượng dự kiến
function updateEstimatedDuration() {
    const loopCount = parseInt(loopCountInput.value) || 1;
    const totalDuration = videoDuration * loopCount;
    estimatedDuration.textContent = formatDuration(totalDuration);
}