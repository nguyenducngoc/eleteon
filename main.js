const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
ffmpeg.setFfmpegPath(ffmpegPath);

function createWindow() {
	const win = new BrowserWindow({
		width: 800,
		height: 600,
		webPreferences: {
			nodeIntegration: true,
			contextIsolation: false
		}
	});

	win.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit();
	}
});

app.on('activate', () => {
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

// Xử lý yêu cầu mở dialog chọn file
ipcMain.handle('open-file-dialog', async (event, type) => {
	const filters = type === 'music' 
		? [{ name: 'Audio', extensions: ['mp3', 'wav', 'ogg', 'm4a', 'flac'] }]
		: [{ name: 'Videos', extensions: ['mp4', 'webm', 'mkv', 'avi'] }];

	const result = await dialog.showOpenDialog({
		properties: ['openFile', 'multiSelections'],
		filters: filters
	});
	
	if (!result.canceled) {
		return result.filePaths;
	}
	return null;
});

// Thêm handlers mới
ipcMain.handle('save-file-dialog', async () => {
    const result = await dialog.showSaveDialog({
        filters: [{ name: 'Video', extensions: ['mp4'] }],
        defaultPath: 'output.mp4'
    });
    return result.filePath;
});

ipcMain.handle('merge-media', async (event, { videoPath, audioPath, outputPath }) => {
    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(videoPath)
            .input(audioPath)
            .outputOptions([
                '-c:v copy',
                '-c:a aac',
                '-map 0:v:0',
                '-map 1:a:0'
            ])
            .save(outputPath)
            .on('end', () => {
                resolve({ success: true, message: 'Ghép media thành công!' });
            })
            .on('error', (err) => {
                reject({ success: false, message: 'Lỗi khi ghép media: ' + err.message });
            });
    });
});

ipcMain.handle('get-video-duration', async (event, videoPath) => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(videoPath, (err, metadata) => {
            if (err) reject(err);
            else resolve(metadata.format.duration);
        });
    });
});

ipcMain.handle('merge-media-with-loop', async (event, { videoPath, audioPath, outputPath, loopCount }) => {
    return new Promise((resolve, reject) => {
        // Tạo file danh sách video tạm thời
        const tempListPath = path.join(app.getPath('temp'), 'videolist.txt');
        const videoContent = Array(loopCount).fill(`file '${videoPath}'`).join('\n');
        require('fs').writeFileSync(tempListPath, videoContent);

        ffmpeg()
            .input(tempListPath)
            .inputOptions(['-f concat', '-safe 0'])
            .input(audioPath)
            .outputOptions([
                '-c:v copy',
                '-c:a aac',
                '-map 0:v:0',
                '-map 1:a:0'
            ])
            .save(outputPath)
            .on('end', () => {
                // Xóa file tạm
                require('fs').unlinkSync(tempListPath);
                resolve({ success: true, message: 'Ghép media thành công!' });
            })
            .on('error', (err) => {
                // Xóa file tạm nếu có lỗi
                if (require('fs').existsSync(tempListPath)) {
                    require('fs').unlinkSync(tempListPath);
                }
                reject({ success: false, message: 'Lỗi khi ghép media: ' + err.message });
            });
    });
});
