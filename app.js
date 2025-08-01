// Portfolio Application with Upload Functionality
class PortfolioApp {
    constructor() {
        this.dbName = 'PortfolioApp';
        this.dbVersion = 1;
        this.db = null;
        this.currentResume = null;
        this.init();
    }

    async init() {
        // Initialize IndexedDB
        try {
            await this.initDB();
        } catch (error) {
            console.error('Failed to initialize database:', error);
        }
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.setupSmoothScrolling();
                this.loadStoredData();
                this.hideLoadingScreen();
            });
        } else {
            this.setupEventListeners();
            this.setupSmoothScrolling();
            this.loadStoredData();
            this.hideLoadingScreen();
        }
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve();
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                console.log('Database upgrade needed');

                // Create object stores
                if (!this.db.objectStoreNames.contains('profilePic')) {
                    this.db.createObjectStore('profilePic', { keyPath: 'id' });
                }

                if (!this.db.objectStoreNames.contains('gallery')) {
                    const galleryStore = this.db.createObjectStore('gallery', { keyPath: 'id', autoIncrement: true });
                    galleryStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                if (!this.db.objectStoreNames.contains('resume')) {
                    this.db.createObjectStore('resume', { keyPath: 'id' });
                }
            };
        });
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 800);
        }
    }

    setupEventListeners() {
        // Profile picture upload
        this.setupProfileUpload();
        
        // Gallery upload
        this.setupGalleryUpload();
        
        // Resume upload
        this.setupResumeUpload();

        // Resume actions
        this.setupResumeActions();

        // Modal events
        this.setupModalEvents();

        // Navigation events
        this.setupNavigationEvents();
    }

    setupProfileUpload() {
        const profileUploadBtn = document.getElementById('profileUploadBtn');
        const profilePicUpload = document.getElementById('profilePicUpload');
        
        if (profileUploadBtn && profilePicUpload) {
            profileUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Profile upload button clicked');
                profilePicUpload.click();
            });

            profilePicUpload.addEventListener('change', (e) => {
                console.log('Profile picture file selected');
                this.handleProfilePicUpload(e);
            });
        } else {
            console.warn('Profile upload elements not found');
        }
    }

    setupGalleryUpload() {
        const galleryUploadBtn = document.getElementById('galleryUploadBtn');
        const galleryUpload = document.getElementById('galleryUpload');
        
        if (galleryUploadBtn && galleryUpload) {
            galleryUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Gallery upload button clicked');
                galleryUpload.click();
            });

            galleryUpload.addEventListener('change', (e) => {
                console.log('Gallery files selected');
                this.handleGalleryUpload(e);
            });
        } else {
            console.warn('Gallery upload elements not found');
        }
    }

    setupResumeUpload() {
        const resumeUploadBtn = document.getElementById('resumeUploadBtn');
        const resumeUpload = document.getElementById('resumeUpload');
        
        if (resumeUploadBtn && resumeUpload) {
            resumeUploadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Resume upload button clicked');
                resumeUpload.click();
            });

            resumeUpload.addEventListener('change', (e) => {
                console.log('Resume file selected');
                this.handleResumeUpload(e);
            });
        } else {
            console.warn('Resume upload elements not found');
        }
    }

    setupResumeActions() {
        const viewResumeBtn = document.getElementById('viewResumeBtn');
        const downloadResumeBtn = document.getElementById('downloadResumeBtn');

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
    }

    setupModalEvents() {
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
    }

    setupNavigationEvents() {
        // Mobile menu toggle
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const navMenu = document.querySelector('.nav-menu');
        
        if (mobileMenuBtn && navMenu) {
            mobileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                navMenu.classList.toggle('active');
            });
        }

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            const navMenu = document.querySelector('.nav-menu');
            const mobileMenuBtn = document.getElementById('mobileMenuBtn');
            
            if (navMenu && mobileMenuBtn && 
                !navMenu.contains(e.target) && 
                !mobileMenuBtn.contains(e.target) && 
                navMenu.classList.contains('active')) {
                navMenu.classList.remove('active');
            }
        });
    }

    async handleProfilePicUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('Processing profile picture:', file.name);

        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showToast('Please select a valid image file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('Image size must be less than 5MB', 'error');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const imageData = e.target.result;
                
                // Store in IndexedDB
                if (this.db) {
                    await this.storeData('profilePic', {
                        id: 'profile',
                        data: imageData,
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        timestamp: Date.now()
                    });
                }

                // Update UI
                const profilePic = document.getElementById('profilePic');
                const uploadOverlay = document.getElementById('profileUploadOverlay');
                
                if (profilePic) {
                    profilePic.src = imageData;
                    console.log('Profile picture updated');
                }
                
                if (uploadOverlay) {
                    uploadOverlay.classList.add('hidden');
                    console.log('Upload overlay hidden');
                }

                this.showToast('Profile picture uploaded successfully!', 'success');
            };
            
            reader.onerror = () => {
                console.error('Error reading file');
                this.showToast('Error reading file', 'error');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading profile picture:', error);
            this.showToast('Error uploading profile picture', 'error');
        }

        // Clear the input
        event.target.value = '';
    }

    async handleGalleryUpload(event) {
        const files = Array.from(event.target.files);
        if (!files.length) {
            console.log('No files selected');
            return;
        }

        console.log('Processing gallery files:', files.length);

        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/webm'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        let uploadedCount = 0;

        for (const file of files) {
            // Validate file type
            if (!validTypes.includes(file.type)) {
                this.showToast(`${file.name}: Invalid file type`, 'error');
                continue;
            }

            // Validate file size
            if (file.size > maxSize) {
                this.showToast(`${file.name}: File size must be less than 10MB`, 'error');
                continue;
            }

            try {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    const mediaData = e.target.result;
                    
                    // Store in IndexedDB
                    if (this.db) {
                        await this.storeData('gallery', {
                            data: mediaData,
                            filename: file.name,
                            size: file.size,
                            type: file.type,
                            timestamp: Date.now()
                        });
                    }

                    // Update UI
                    this.addMediaToGallery({
                        data: mediaData,
                        filename: file.name,
                        type: file.type
                    });

                    uploadedCount++;
                    console.log(`Uploaded ${file.name}`);
                };
                
                reader.onerror = () => {
                    console.error(`Error reading ${file.name}`);
                };
                
                reader.readAsDataURL(file);
            } catch (error) {
                console.error('Error uploading media:', error);
                this.showToast(`Error uploading ${file.name}`, 'error');
            }
        }

        // Hide upload button after first upload
        const uploadArea = document.getElementById('galleryUploadArea');
        if (uploadArea) {
            uploadArea.classList.add('hidden');
            console.log('Gallery upload area hidden');
        }

        this.showToast(`${uploadedCount} media files uploaded successfully!`, 'success');

        // Clear the input
        event.target.value = '';
    }

    async handleResumeUpload(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('Processing resume:', file.name);

        // Validate file type
        if (file.type !== 'application/pdf') {
            this.showToast('Please select a PDF file', 'error');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showToast('PDF size must be less than 5MB', 'error');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const pdfData = e.target.result;
                
                // Store in IndexedDB
                if (this.db) {
                    await this.storeData('resume', {
                        id: 'resume',
                        data: pdfData,
                        filename: file.name,
                        size: file.size,
                        type: file.type,
                        timestamp: Date.now()
                    });
                }

                // Update UI
                this.displayResume({
                    filename: file.name,
                    size: file.size,
                    data: pdfData
                });

                // Hide upload button
                const uploadArea = document.getElementById('resumeUploadArea');
                if (uploadArea) {
                    uploadArea.classList.add('hidden');
                    console.log('Resume upload area hidden');
                }

                this.showToast('Resume uploaded successfully!', 'success');
            };
            
            reader.onerror = () => {
                console.error('Error reading PDF file');
                this.showToast('Error reading PDF file', 'error');
            };
            
            reader.readAsDataURL(file);
        } catch (error) {
            console.error('Error uploading resume:', error);
            this.showToast('Error uploading resume', 'error');
        }

        // Clear the input
        event.target.value = '';
    }

    addMediaToGallery(media) {
        const galleryGrid = document.getElementById('galleryGrid');
        if (!galleryGrid) {
            console.warn('Gallery grid not found');
            return;
        }

        const mediaItem = document.createElement('div');
        mediaItem.className = 'media-item';
        mediaItem.style.cursor = 'pointer';

        let mediaElement;
        if (media.type.startsWith('image/')) {
            mediaElement = document.createElement('img');
            mediaElement.src = media.data;
            mediaElement.alt = media.filename;
        } else if (media.type.startsWith('video/')) {
            mediaElement = document.createElement('video');
            mediaElement.src = media.data;
            mediaElement.muted = true;
            mediaElement.style.objectFit = 'cover';
        }

        const overlay = document.createElement('div');
        overlay.className = 'media-overlay';
        
        const viewText = document.createElement('div');
        viewText.className = 'view-text';
        viewText.textContent = media.type.startsWith('video/') ? '▶ Play Video' : 'Click to View';
        
        overlay.appendChild(viewText);
        mediaItem.appendChild(mediaElement);
        mediaItem.appendChild(overlay);

        // Add click handler
        mediaItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.openMediaModal(media);
        });

        galleryGrid.appendChild(mediaItem);
        console.log('Media item added to gallery');
    }

    displayResume(resume) {
        const resumeDisplay = document.getElementById('resumeDisplay');
        const resumeFileName = document.getElementById('resumeFileName');
        const resumeFileSize = document.getElementById('resumeFileSize');

        if (resumeDisplay) {
            resumeDisplay.style.display = 'block';
        }

        if (resumeFileName) {
            resumeFileName.textContent = resume.filename;
        }

        if (resumeFileSize) {
            resumeFileSize.textContent = this.formatFileSize(resume.size);
        }

        // Store resume data for viewing/downloading
        this.currentResume = resume;
        console.log('Resume displayed');
    }

    async viewResume() {
        if (!this.currentResume && this.db) {
            const resumeData = await this.getData('resume', 'resume');
            if (!resumeData) {
                this.showToast('No resume found', 'error');
                return;
            }
            this.currentResume = resumeData;
        }

        if (!this.currentResume) {
            this.showToast('No resume available', 'error');
            return;
        }

        const modal = document.getElementById('mediaModal');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        modalBody.innerHTML = `<iframe src="${this.currentResume.data}" width="100%" height="600px" style="border: none; border-radius: var(--radius-base);"></iframe>`;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('Resume modal opened');
    }

    async downloadResume() {
        if (!this.currentResume && this.db) {
            const resumeData = await this.getData('resume', 'resume');
            if (!resumeData) {
                this.showToast('No resume found', 'error');
                return;
            }
            this.currentResume = resumeData;
        }

        if (!this.currentResume) {
            this.showToast('No resume available', 'error');
            return;
        }

        // Create download link
        const link = document.createElement('a');
        link.href = this.currentResume.data;
        link.download = this.currentResume.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showToast('Resume download started', 'success');
        console.log('Resume download initiated');
    }

    openMediaModal(media) {
        const modal = document.getElementById('mediaModal');
        const modalBody = document.getElementById('modalBody');

        if (!modal || !modalBody) return;

        let content;
        if (media.type.startsWith('image/')) {
            content = `<img src="${media.data}" alt="${media.filename}" style="max-width: 100%; max-height: 80vh; border-radius: var(--radius-base);">`;
        } else if (media.type.startsWith('video/')) {
            content = `<video src="${media.data}" controls style="max-width: 100%; max-height: 80vh; border-radius: var(--radius-base);">Your browser does not support video playback.</video>`;
        }

        modalBody.innerHTML = content;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        console.log('Media modal opened');
    }

    closeModal() {
        const modal = document.getElementById('mediaModal');
        const modalBody = document.getElementById('modalBody');
        
        if (!modal || !modalBody) return;
        
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        modalBody.innerHTML = '';
        console.log('Modal closed');
    }

    async storeData(storeName, data) {
        if (!this.db) {
            console.warn('Database not available');
            return;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.put(data);

            request.onsuccess = () => {
                console.log(`Data stored in ${storeName}`);
                resolve(request.result);
            };
            request.onerror = () => {
                console.error(`Error storing data in ${storeName}:`, request.error);
                reject(request.error);
            };
        });
    }

    async getData(storeName, key) {
        if (!this.db) {
            console.warn('Database not available');
            return null;
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllData(storeName) {
        if (!this.db) {
            console.warn('Database not available');
            return [];
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async loadStoredData() {
        if (!this.db) {
            console.warn('Database not available for loading data');
            return;
        }

        try {
            console.log('Loading stored data...');

            // Load profile picture
            const profileData = await this.getData('profilePic', 'profile');
            if (profileData) {
                const profilePic = document.getElementById('profilePic');
                const uploadOverlay = document.getElementById('profileUploadOverlay');
                
                if (profilePic) {
                    profilePic.src = profileData.data;
                    console.log('Profile picture loaded');
                }
                
                if (uploadOverlay) {
                    uploadOverlay.classList.add('hidden');
                }
            }

            // Load gallery items
            const galleryData = await this.getAllData('gallery');
            if (galleryData && galleryData.length > 0) {
                const uploadArea = document.getElementById('galleryUploadArea');
                if (uploadArea) {
                    uploadArea.classList.add('hidden');
                }

                // Sort by timestamp and display
                galleryData.sort((a, b) => b.timestamp - a.timestamp);
                galleryData.forEach(item => {
                    this.addMediaToGallery(item);
                });
                console.log(`Loaded ${galleryData.length} gallery items`);
            }

            // Load resume
            const resumeData = await this.getData('resume', 'resume');
            if (resumeData) {
                this.displayResume(resumeData);
                
                const uploadArea = document.getElementById('resumeUploadArea');
                if (uploadArea) {
                    uploadArea.classList.add('hidden');
                }
                console.log('Resume loaded');
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
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
                    const targetPosition = targetSection.offsetTop - navHeight - 20;
                    
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

        console.log(`Toast: ${message} (${type})`);
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Utility method for external access
    scrollToSection(sectionId) {
        const targetSection = document.querySelector(sectionId);
        if (targetSection) {
            const navbar = document.querySelector('.navbar');
            const navHeight = navbar ? navbar.offsetHeight : 70;
            const targetPosition = targetSection.offsetTop - navHeight - 20;
            
            window.scrollTo({
                top: Math.max(0, targetPosition),
                behavior: 'smooth'
            });
        }
    }

    // Public method to get application state (for debugging)
    getState() {
        return {
            modalOpen: !document.getElementById('mediaModal')?.classList.contains('hidden'),
            mobileMenuOpen: document.querySelector('.nav-menu')?.classList.contains('active') || false,
            currentSection: this.getCurrentSection(),
            hasProfilePic: !document.getElementById('profileUploadOverlay')?.classList.contains('hidden'),
            hasGalleryItems: document.querySelectorAll('#galleryGrid .media-item').length > 0,
            hasResume: document.getElementById('resumeDisplay')?.style.display !== 'none',
            dbConnected: !!this.db
        };
    }

    getCurrentSection() {
        const sections = document.querySelectorAll('.section');
        const scrollPosition = window.scrollY + 100;
        
        for (let section of sections) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                return section.id;
            }
        }
        
        return 'hero';
    }
}

// Initialize the application
const app = new PortfolioApp();

// Export for global access
window.portfolioApp = app;

// Add scroll effects and animations
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
    
    // Add stagger animation to cards
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = `all 0.6s ease-out ${index * 0.1}s`;
        
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, { threshold: 0.1 });
        
        cardObserver.observe(card);
    });
    
    // Add hover effects to skill items
    const skillItems = document.querySelectorAll('.skill-item');
    skillItems.forEach(item => {
        item.addEventListener('mouseenter', () => {
            const logo = item.querySelector('.skill-logo-placeholder');
            if (logo) {
                logo.style.transform = 'scale(1.1) rotate(5deg)';
                logo.style.transition = 'transform 0.3s ease';
            }
        });
        
        item.addEventListener('mouseleave', () => {
            const logo = item.querySelector('.skill-logo-placeholder');
            if (logo) {
                logo.style.transform = 'scale(1) rotate(0deg)';
            }
        });
    });
    
    // Add active state to navigation links based on scroll position
    window.addEventListener('scroll', () => {
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');
        const scrollPosition = window.scrollY + 150;
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            const sectionId = section.getAttribute('id');
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
        
        // Handle hero section separately
        if (window.scrollY < 100) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#hero') {
                    link.classList.add('active');
                }
            });
        }
    });
    
    // Add typing animation to hero subtitle
    const heroSubtitle = document.querySelector('.hero-subtitle');
    if (heroSubtitle) {
        const text = heroSubtitle.textContent;
        heroSubtitle.textContent = '';
        heroSubtitle.style.opacity = '1';
        
        let i = 0;
        const typeWriter = () => {
            if (i < text.length) {
                heroSubtitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 80);
            }
        };
        
        // Start typing animation after a delay
        setTimeout(typeWriter, 1500);
    }
});

// Add smooth reveal animation for elements when they come into view
const revealElements = () => {
    const reveals = document.querySelectorAll('.reveal');
    
    reveals.forEach(element => {
        const windowHeight = window.innerHeight;
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < windowHeight - elementVisible) {
            element.classList.add('active');
        }
    });
};

window.addEventListener('scroll', revealElements);

// Initialize reveal animation
document.addEventListener('DOMContentLoaded', () => {
    // Add reveal class to elements that should animate in
    const animateElements = document.querySelectorAll('.card, .skill-item, .media-item');
    animateElements.forEach(el => el.classList.add('reveal'));
    
    // Initial check for elements already in view
    revealElements();
});