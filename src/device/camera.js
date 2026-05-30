import { appState } from '../state/app-state.js';

/**
 * Camera & Device Utilities
 */
export const DeviceUtils = {
    async startCamera(previewElementId = 'camera-preview') {
        const preview = document.getElementById(previewElementId);
        if (!preview) return;

        try {
            this.stopCamera(); // Ensure clean start
            
            appState.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: false
            });
            
            const video = document.createElement('video');
            video.srcObject = appState.stream;
            video.setAttribute('playsinline', true);
            video.className = 'w-full h-full object-cover';
            
            preview.innerHTML = '';
            preview.appendChild(video);
            video.play();
            
            return true;
        } catch (error) {
            console.error('Camera Access Error:', error);
            preview.innerHTML = `<div class="p-8 text-center text-white/50 text-sm">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i><br>
                無法啟動相機。請確保已授權且使用 HTTPS。
            </div>`;
            return false;
        }
    },

    stopCamera() {
        if (appState.stream) {
            appState.stream.getTracks().forEach(track => track.stop());
            appState.stream = null;
        }
    },

    captureFrame(previewElementId = 'camera-preview') {
        const preview = document.getElementById(previewElementId);
        const video = preview ? preview.querySelector('video') : null;
        if (!video) return null;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);
        
        return canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
    },

    async processImageFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
};
