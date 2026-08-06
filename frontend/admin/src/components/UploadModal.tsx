import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase';
import { t } from '../strings';
import { ProductCsvCreator } from './ProductCsvCreator';
import './UploadModal.scss';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeMode, setActiveMode] = useState<'upload' | 'create'>('create');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Toast notifications states
  const [toast, setToast] = useState<{ text: string; isError: boolean } | null>(null);
  const [showToast, setShowToast] = useState<boolean>(false);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Transition state
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const handleClose = useCallback(() => {
    if (uploading) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 350);
  }, [onClose, uploading]);

  // Show notification popdown
  const showNotification = (text: string, isError: boolean) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    setToast({ text, isError });
    setTimeout(() => {
      setShowToast(true);
    }, 10);

    toastTimeoutRef.current = setTimeout(() => {
      setShowToast(false);
      toastTimeoutRef.current = setTimeout(() => {
        setToast(null);
      }, 400);
    }, 4000);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Reset modal state on close
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setProgress(0);
      setUploading(false);
      setMessage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    // Fallback for browsers without closedby support
    const handleLightDismiss = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      if (uploading) return;

      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );

      if (isDialogContent) return;
      handleClose();
    };

    // Listen to native dialog cancel (Esc key) to sync React state
    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (uploading) return;
      handleClose();
    };

    dialog.addEventListener('click', handleLightDismiss);
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('click', handleLightDismiss);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [handleClose, uploading]);

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (selectedFile: File) => {
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv' || extension === 'json') {
      setFile(selectedFile);
      setMessage(null);
    } else {
      setFile(null);
      setMessage({ text: t('invalidFileType'), isError: true });
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFileToStorage = (targetFile: File) => {
    setUploading(true);
    setProgress(0);
    setMessage(null);

    const timestamp = Date.now();
    const destinationRef = storageRef(storage, `imports/prices/${timestamp}_${targetFile.name}`);
    const uploadTask = uploadBytesResumable(destinationRef, targetFile);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const percentage = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        setProgress(percentage);
      },
      (error) => {
        console.error("Upload error:", error);
        setUploading(false);
        showNotification(t('uploadErrorText'), true);
      },
      () => {
        setProgress(100);
        const fileName = targetFile.name;
        showNotification(t('uploadSuccessText', { filename: fileName }), false);
        
        // Wait 1.2s to show success and 100% progress before starting smooth fade out
        setTimeout(() => {
          setIsClosing(true);
          setTimeout(() => {
            onClose();
            setIsClosing(false);
          }, 350);
        }, 1200);
      }
    );
  };

  const handleUpload = () => {
    if (!file) {
      setMessage({ text: t('noFileSelected'), isError: true });
      return;
    }
    uploadFileToStorage(file);
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        className="upload-dialog"
        aria-labelledby="dialog-title"
        {...({ closedby: "any" } as React.HTMLAttributes<HTMLDialogElement>)}
      >
        <div className={`dialog-content ${isOpen && !isClosing ? 'open' : ''} ${isClosing ? 'closing' : ''} creator-expanded`}>
          <div className="dialog-header">
            <h2 id="dialog-title">{t('modalTitle')}</h2>
            <button className="close-x-btn" onClick={handleClose} aria-label={t('closeButton')} disabled={uploading}>
              &times;
            </button>
          </div>

          <div className="mode-toggle-tabs">
            <button
              type="button"
              className={`mode-tab-btn ${activeMode === 'create' ? 'active' : ''}`}
              onClick={() => setActiveMode('create')}
              disabled={uploading}
            >
              📝 {t('modeCreateCsv')}
            </button>
            <button
              type="button"
              className={`mode-tab-btn ${activeMode === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveMode('upload')}
              disabled={uploading}
            >
              📁 {t('modeUploadExisting')}
            </button>
          </div>

          {activeMode === 'create' ? (
            <ProductCsvCreator
              onUploadFile={uploadFileToStorage}
              uploading={uploading}
            />
          ) : (
            <>
              <p className="dialog-subtitle">{t('modalSubtitle')}</p>

              <div 
                className={`drag-drop-zone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={onButtonClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden-file-input"
                  accept=".csv, .json"
                  onChange={handleFileChange}
                />
                
                <div className="upload-icon-container">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="upload-svg">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </div>
                
                <p className="drag-text">
                  {file ? `${t('selectedFile')} ${file.name}` : t('dragAreaText')}
                </p>
              </div>

              {message && (
                <div className={`message-alert ${message.isError ? 'error' : 'success'}`}>
                  {message.text}
                </div>
              )}

              <div className="dialog-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleClose}
                  disabled={uploading}
                >
                  {t('closeButton')}
                </button>
                
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleUpload}
                  disabled={uploading || !file}
                >
                  {t('submitButton')}
                </button>
              </div>
            </>
          )}

          {uploading && (
            <div className="progress-container margin-top-md">
              <div className="progress-bar-wrapper">
                <div className="progress-bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-text">{t('uploadingText', { progress })}</span>
            </div>
          )}
        </div>
      </dialog>
      {toast && createPortal(
        <div className={`toast-notification ${toast.isError ? 'error' : 'success'} ${showToast ? 'show' : ''}`}>
          <div className="toast-icon">
            {toast.isError ? '❌' : '✨'}
          </div>
          <div className="toast-content">
            {toast.text}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
