// Portfolio Application with IndexedDB JavaScript
class PortfolioApp {
    constructor() {
        this.db = null;
        this.dbName = 'DevangPortfolio';
        this.dbVersion = 1;
        this.mediaItems = [];
        this.resumeData = null;
        this.profilePicData = null;
        this.init();
    }

    async init() {
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async () => {
                await this.initializeDatabase();
                this.setupEventListeners();
                this.setupSmoothScrolling();
                await this.loadAllData();
                this.hideLoadingScreen();
            });
        } else {
            await this.initializeDatabase();
            this.setupEventListeners();
            this.setupSmoothScrolling();
            await this.loadAllData();
            this.hideLoadingScreen();
        }
    }

    async initializeDatabase() {
        try {
            return new Promise((resolve, reject) => {
                const request = indexedDB.open(this.dbName, this.dbVersion);
                
                request.onerror = () => {
                    this.showToast('Error initializing database', 'error');
                    reject(request.error);
                };
                
                request.onsuccess = () => {
                    this.db = request.result;
                    resolve(this.db);
                };
                
                request.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    
                    // Create object stores
                    if (!db.objectStoreNames.contains('profilePicture')) {
                        db.createObjectStore('profilePicture', { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains('mediaItems')) {
                        db.createObjectStore('mediaItems', { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains('resume')) {
                        db.createObjectStore('resume', { keyPath: 'id' });
                    }
                    
                    if (!db.objectStoreNames.contains('portfolioData')) {
                        db.createObjectStore('portfolioData', { keyPath: 'key' });
                    }
                };
            });
        } catch (error) {
            console.error('Database initialization failed:', error);
            this.showToast('Database initialization failed. Some features may not work.', 'error');
        }
    }

    async saveToDatabase(storeName, data) {
        if (!this.db) return false;
        
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await store.put(data);
            return true;
        } catch (error) {
            console.error(`Error saving to ${storeName}:`, error);
            return false;
        }
    }

    async getFromDatabase(storeName, key) {
        if (!this.db) return null;
        
        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.get(key);
                
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error getting from ${storeName}:`, error);
            return null;
        }
    }

    async getAllFromDatabase(storeName) {
        if (!this.db) return [];
        
        try {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readonly');
                const store = transaction.objectStore(storeName);
                const request = store.getAll();
                
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch (error) {
            console.error(`Error getting all from ${storeName}:`, error);
            return [];
        }
    }

    async deleteFromDatabase(storeName, key) {
        if (!this.db) return false;
        
        try {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            await store.delete(key);
            return true;
        } catch (error) {
            console.error(`Error deleting from ${storeName}:`, error);
            return false;
        }
    }

    async loadAllData() {
        try {
            // Load profile picture
            const savedProfilePic = await this.getFromDatabase('profilePicture', 'current');
            if (savedProfilePic && savedProfilePic.data) {
                this.profilePicData = savedProfilePic;
                const profilePic = document.getElementById('profilePic');
                if (profilePic) {
                    profilePic.src = savedProfilePic.data;
                }
            }

            // Load media items
            const savedMediaItems = await this.getAllFromDatabase('mediaItems');
            this.mediaItems = savedMediaItems || [];
            this.mediaItems.forEach(item => this.renderMediaItem(item));

            // Load resume
            const savedResume = await this.getFromDatabase('resume', 'current');
            if (savedResume && savedResume.data) {
                this.resumeData = savedResume;
                this.showResumeInfo();
            }
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showToast('Error loading saved data', 'error');
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }

    setupEventListeners() {
        // Profile picture upload
        const profilePicContainer = document.querySelector('.profile-pic-container');
        const profilePicInput = document.getElementById('profilePicInput');
        
        if (profilePicContainer && profilePicInput) {
            profilePicContainer.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                profilePicInput.click();
            });
            
            profilePicInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleProfilePicUpload(e.target.files[0]);
                }
            });
        }

        // Media gallery upload
        const uploadArea = document.getElementById('uploadArea');
        const mediaInput = document.getElementById('mediaInput');
        const selectFilesBtn = document.getElementById('selectFilesBtn');

        if (selectFilesBtn && mediaInput) {
            selectFilesBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                mediaInput.click();
            });
        }

        if (uploadArea && mediaInput) {
            uploadArea.addEventListener('click', (e) => {
                e.preventDefault();
                if (!e.target.classList.contains('btn')) {
                    mediaInput.click();
                }
            });

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });

            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const files = Array.from(e.dataTransfer.files);
                this.handleMediaUpload(files);
            });

            mediaInput.addEventListener('change', (e) => {
                if (e.target.files) {
                    const files = Array.from(e.target.files);
                    this.handleMediaUpload(files);
                }
            });
        }

        // Resume upload
        const uploadResumeBtn = document.getElementById('uploadResumeBtn');
        const resumeInput = document.getElementById('resumeInput');
        const viewResumeBtn = document.getElementById('viewResumeBtn');
        const downloadResumeBtn = document.getElementById('downloadResumeBtn');
        const deleteResumeBtn = document.getElementById('deleteResumeBtn');

        if (uploadResumeBtn && resumeInput) {
            uploadResumeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                resumeInput.click();
            });

            resumeInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    this.handleResumeUpload(e.target.files[0]);
                }
            });
        }

        if (viewResumeBtn) {
            viewResumeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.viewResume();
            });
        }

        if (downloadResumeBtn) {
            downloadResumeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadResume();
            });
        }

        if (deleteResumeBtn) {
            deleteResumeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.deleteResume();
            });
        }

        // Modal
        const modal = document.getElementById('mediaModal');
        const closeModal = document.getElementById('closeModal');
        const modalOverlay = document.querySelector('.modal-overlay');

        if (closeModal) {
            closeModal.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeModal();
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });

        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.querySelector('.nav-menu');
        
        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });
        }
    }

    setupSmoothScrolling() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const targetId = link.getAttribute('href');
                if (!targetId || !targetId.startsWith('#')) return;
                
                const targetSection = document.querySelector(targetId);
                if (targetSection) {
                    const navbar = document.querySelector('.navbar');
                    const navHeight = navbar ? navbar.offsetHeight : 70;
                    const targetPosition = targetSection.offsetTop - navHeight - 20; // Added extra padding
                    
                    window.scrollTo({
                        top: Math.max(0, targetPosition),
                        behavior: 'smooth'
                    });
                }
                
                // Close mobile menu if open
                const navMenu = document.querySelector('.nav-menu');
                if (navMenu && navMenu.classList.contains('active')) {
                    navMenu.classList.remove('active');
                }
            });
        });
    }

    async handleProfilePicUpload(file) {
        if (!file) return;

        if (!this.isValidImageFile(file)) {
            this.showToast('Please select a valid image file (JPG, PNG, GIF, WebP)', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            this.showToast('Image file size should be less than 5MB', 'error');
            return;
        }

        this.showLoader('profileLoader');

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const profileData = {
                    id: 'current',
                    name: file.name,
                    data: e.target.result,
                    size: file.size,
                    timestamp: Date.now()
                };

                const saved = await this.saveToDatabase('profilePicture', profileData);
                
                if (saved) {
                    const profilePic = document.getElementById('profilePic');
                    if (profilePic) {
                        profilePic.src = e.target.result;
                    }
                    this.profilePicData = profileData;
                    this.showToast('Profile picture saved successfully!', 'success');
                } else {
                    this.showToast('Error saving profile picture', 'error');
                }
                
                this.hideLoader('profileLoader');
            };
            
            reader.onerror = () => {
                this.showToast('Error reading file', 'error');
                this.hideLoader('profileLoader');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            this.showToast('Error processing profile picture', 'error');
            this.hideLoader('profileLoader');
        }
    }

    async handleMediaUpload(files) {
        if (!files || files.length === 0) return;

        const validFiles = files.filter(file => {
            if (this.isValidMediaFile(file)) {
                if (file.size > 50 * 1024 * 1024) { // 50MB limit
                    this.showToast(`${file.name} is too large (max 50MB)`, 'error');
                    return false;
                }
                return true;
            } else {
                this.showToast(`${file.name} is not a supported format`, 'error');
                return false;
            }
        });

        if (validFiles.length === 0) return;

        this.showLoader('galleryLoader');

        try {
            let successCount = 0;
            
            for (const file of validFiles) {
                const reader = new FileReader();
                
                await new Promise((resolve, reject) => {
                    reader.onload = async (e) => {
                        const mediaItem = {
                            id: Date.now() + Math.random(),
                            name: file.name,
                            type: file.type,
                            data: e.target.result,
                            size: file.size,
                            isVideo: file.type.startsWith('video/'),
                            isPDF: file.type === 'application/pdf',
                            timestamp: Date.now()
                        };

                        const saved = await this.saveToDatabase('mediaItems', mediaItem);
                        
                        if (saved) {
                            this.mediaItems.push(mediaItem);
                            this.renderMediaItem(mediaItem);
                            successCount++;
                        }
                        
                        resolve();
                    };
                    
                    reader.onerror = () => {
                        this.showToast(`Error reading ${file.name}`, 'error');
                        resolve();
                    };
                    
                    reader.readAsDataURL(file);
                });
            }

            if (successCount > 0) {
                this.showToast(`${successCount} file(s) saved successfully!`, 'success');
            }
            
        } catch (error) {
            this.showToast('Error uploading media files', 'error');
        }

        this.hideLoader('galleryLoader');
        
        // Clear the input
        const mediaInput = document.getElementById('mediaInput');
        if (mediaInput) {
            mediaInput.value = '';
        }
    }

    renderMediaItem(item) {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) return;

        const mediaElement = document.createElement('div');
        mediaElement.className = 'media-item';
        mediaElement.dataset.id = item.id;

        let content;
        if (item.isPDF) {
            content = `
                <div class="pdf-item">
                    <div class="pdf-icon">📄</div>
                    <div class="pdf-filename">${item.name}</div>
                </div>
                <div class="media-overlay"></div>
            `;
        } else if (item.isVideo) {
            content = `
                <video src="${item.data}" muted preload="metadata">
                    Your browser does not support the video tag.
                </video>
                <div class="media-overlay">
                    <div class="play-icon">▶</div>
                </div>
            `;
        } else {
            content = `
                <img src="${item.data}" alt="${item.name}" loading="lazy">
                <div class="media-overlay"></div>
            `;
        }

        mediaElement.innerHTML = `
            ${content}
            <button class="delete-btn" data-id="${item.id}">&times;</button>
        `;

        // Add click event for viewing media
        mediaElement.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-btn')) {
                this.openMediaModal(item);
            }
        });

        // Add delete functionality
        const deleteBtn = mediaElement.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteMediaItem(item.id);
        });

        galleryGrid.appendChild(mediaElement);
    }

    async deleteMediaItem(id) {
        const deleted = await this.deleteFromDatabase('mediaItems', id);
        
        if (deleted) {
            this.mediaItems = this.mediaItems.filter(item => item.id != id);
            const mediaElement = document.querySelector(`[data-id="${id}"]`);
            if (mediaElement) {
                mediaElement.remove();
            }
            this.showToast('Media item deleted', 'success');
        } else {
            this.showToast('Error deleting media item', 'error');
        }
    }

    openMediaModal(item) {
        const modal = document.getElementById('mediaModal');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        let content;
        if (item.isPDF) {
            try {
                // Create a blob and object URL for PDF viewing
                const byteCharacters = atob(item.data.split(',')[1]);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                
                content = `<iframe src="${url}" style="width: 80vw; height: 80vh; border: none; border-radius: 8px;"></iframe>`;
                
                // Clean up the URL after modal is closed
                setTimeout(() => {
                    modal.addEventListener('click', () => {
                        URL.revokeObjectURL(url);
                    }, { once: true });
                }, 100);
            } catch (error) {
                content = `
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 48px; margin-bottom: 16px;">📄</div>
                        <h3>PDF Document</h3>
                        <p>${item.name}</p>
                        <button onclick="app.downloadPDF('${item.id}')" class="btn btn--primary">Download PDF</button>
                    </div>
                `;
            }
        } else if (item.isVideo) {
            content = `<video src="${item.data}" controls autoplay style="max-width: 100%; max-height: 80vh; border-radius: 8px;">
                Your browser does not support the video tag.
            </video>`;
        } else {
            content = `<img src="${item.data}" alt="${item.name}" style="max-width: 100%; max-height: 80vh; border-radius: 8px;">`;
        }

        modalBody.innerHTML = content;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    downloadPDF(itemId) {
        const item = this.mediaItems.find(item => item.id == itemId);
        if (!item || !item.isPDF) return;

        try {
            const link = document.createElement('a');
            link.href = item.data;
            link.download = item.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('PDF downloaded!', 'success');
        } catch (error) {
            this.showToast('Error downloading PDF', 'error');
        }
    }

    closeModal() {
        const modal = document.getElementById('mediaModal');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalBody) return;
        
        // Stop any playing videos
        const videos = modalBody.querySelectorAll('video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
        
        // Clean up any object URLs
        const iframes = modalBody.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            const src = iframe.src;
            if (src && src.startsWith('blob:')) {
                URL.revokeObjectURL(src);
            }
        });
        
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        modalBody.innerHTML = '';
    }

    async handleResumeUpload(file) {
        if (!file) return;

        if (file.type !== 'application/pdf') {
            this.showToast('Please select a PDF file', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            this.showToast('PDF file size should be less than 10MB', 'error');
            return;
        }

        this.showLoader('resumeLoader');

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const resumeData = {
                    id: 'current',
                    name: file.name,
                    data: e.target.result,
                    size: file.size,
                    type: file.type,
                    timestamp: Date.now()
                };

                const saved = await this.saveToDatabase('resume', resumeData);
                
                if (saved) {
                    this.resumeData = resumeData;
                    this.showResumeInfo();
                    this.showToast('Resume saved successfully!', 'success');
                } else {
                    this.showToast('Error saving resume', 'error');
                }
                
                this.hideLoader('resumeLoader');
            };
            
            reader.onerror = () => {
                this.showToast('Error reading PDF file', 'error');
                this.hideLoader('resumeLoader');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            this.showToast('Error processing resume', 'error');
            this.hideLoader('resumeLoader');
        }
    }

    showResumeInfo() {
        const resumeInfo = document.getElementById('resumeInfo');
        const resumeFilename = document.getElementById('resumeFilename');
        const uploadBtn = document.getElementById('uploadResumeBtn');

        if (resumeFilename) {
            resumeFilename.textContent = this.resumeData.name;
        }
        if (resumeInfo) {
            resumeInfo.style.display = 'block';
        }
        if (uploadBtn) {
            uploadBtn.textContent = 'Change Resume';
        }
    }

    viewResume() {
        if (!this.resumeData) return;

        try {
            // Create a blob and open in new window
            const byteCharacters = atob(this.resumeData.data.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });
            
            const url = URL.createObjectURL(blob);
            window.open(url, '_blank');
            
            // Clean up the URL after a delay
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            this.showToast('Error viewing resume', 'error');
        }
    }

    downloadResume() {
        if (!this.resumeData) return;

        try {
            const link = document.createElement('a');
            link.href = this.resumeData.data;
            link.download = this.resumeData.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('Resume downloaded!', 'success');
        } catch (error) {
            this.showToast('Error downloading resume', 'error');
        }
    }

    async deleteResume() {
        const deleted = await this.deleteFromDatabase('resume', 'current');
        
        if (deleted) {
            this.resumeData = null;
            const resumeInfo = document.getElementById('resumeInfo');
            const uploadBtn = document.getElementById('uploadResumeBtn');
            
            if (resumeInfo) {
                resumeInfo.style.display = 'none';
            }
            if (uploadBtn) {
                uploadBtn.textContent = 'Upload Resume (PDF)';
            }
            
            // Clear the input
            const resumeInput = document.getElementById('resumeInput');
            if (resumeInput) {
                resumeInput.value = '';
            }
            
            this.showToast('Resume deleted', 'success');
        } else {
            this.showToast('Error deleting resume', 'error');
        }
    }

    showLoader(loaderId) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.classList.remove('hidden');
        }
    }

    hideLoader(loaderId) {
        const loader = document.getElementById(loaderId);
        if (loader) {
            loader.classList.add('hidden');
        }
    }

    isValidImageFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return validTypes.includes(file.type);
    }

    isValidMediaFile(file) {
        const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const validVideoTypes = ['video/mp4', 'video/mov', 'video/webm', 'video/quicktime'];
        const validPDFTypes = ['application/pdf'];
        return validImageTypes.includes(file.type) || validVideoTypes.includes(file.type) || validPDFTypes.includes(file.type);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastContent = document.getElementById('toastContent');
        
        if (!toast || !toastContent) return;
        
        toastContent.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');
        
        // Show toast
        setTimeout(() => {
            toast.classList.add('show');
        }, 100);
        
        // Hide toast after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.classList.add('hidden');
            }, 300);
        }, 4000);
    }

    // Public method to get application state (for debugging)
    getState() {
        return {
            mediaItems: this.mediaItems.length,
            hasResume: !!this.resumeData,
            hasProfilePic: !!this.profilePicData,
            databaseConnected: !!this.db
        };
    }
}

// Initialize the application
const app = new PortfolioApp();

// Export for global access
window.portfolioApp = app;

// Add scroll effect to navbar and section animations
window.addEventListener('load', () => {
    // Add scroll effect to navbar
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.style.background = 'rgba(255, 255, 255, 0.98)';
                navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.15)';
            } else {
                navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            }
        }
    });
    
    // Add intersection observer for section animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'all 0.6s ease-out';
        observer.observe(section);
    });
});