class webcam {
    constructor(videoElement) {
        this.videoElement = videoElement;        
        this.mediaRecorder = null;
        this.recordedChunks = [];
       
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.videoElement.srcObject = stream;
            this.mediaRecorder = new MediaRecorder(stream);

            this.mediaRecorder.ondataavailable = event => {
                this.recordedChunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const recordedBlob = new Blob(this.recordedChunks, { type: 'video/webm' });
                this.recordedChunks = [];
                this.downloadRecording(recordedBlob); // Chama a função de download após a gravação
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Erro ao iniciar a gravação:', error);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
    }

    downloadRecording(blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style = 'display: none';
        a.href = url;
        a.download = 'gravação.webm';
        a.click();
        window.URL.revokeObjectURL(url);
    }
}

