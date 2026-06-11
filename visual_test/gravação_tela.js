class Gravacão {
    constructor() {
        this.mediaRecorder = null;
        this.chunks = [];
        this.stream = null;
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            this.mediaRecorder = new MediaRecorder(this.stream);

            this.mediaRecorder.ondataavailable = event => {
                this.chunks.push(event.data);
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                const videoUrl = URL.createObjectURL(blob);
                this.download(videoUrl, 'recording.webm');
                URL.revokeObjectURL(videoUrl);
            };

            this.mediaRecorder.start();
        } catch (error) {
            console.error('Erro ao capturar a tela:', error);
        }
    }

    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.stream.getTracks().forEach(track => track.stop());
        }
    }

    download(url, fileName) {
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

}