import React, { useEffect, useRef, useState } from 'react';
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebase';
import { t } from '../strings';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

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

      const rect = dialog.getBoundingClientRect();
      const isDialogContent = (
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width
      );

      if (isDialogContent) return;
      onClose();
    };

    // Listen to native dialog cancel (Esc key) to sync React state
    const handleCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };

    dialog.addEventListener('click', handleLightDismiss);
    dialog.addEventListener('cancel', handleCancel);

    return () => {
      dialog.removeEventListener('click', handleLightDismiss);
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [onClose]);

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

  const handleUpload = () => {
    if (!file) {
      setMessage({ text: t('noFileSelected'), isError: true });
      return;
    }

    setUploading(true);
    setProgress(0);
    setMessage(null);

    const timestamp = Date.now();
    const destinationRef = storageRef(storage, `admin_uploads/${timestamp}_${file.name}`);
    const uploadTask = uploadBytesResumable(destinationRef, file);

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
        setMessage({ text: t('uploadErrorText'), isError: true });
      },
      () => {
        setUploading(false);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        setMessage({ text: t('uploadSuccessText', { filename: file.name }), isError: false });
      }
    );
  };

  return (
    <dialog
      ref={dialogRef}
      className="upload-dialog"
      aria-labelledby="dialog-title"
      // Using closedby attribute with type cast for compilation if not in HTMLDialogElement type definition yet
      {...({ closedby: "any" } as React.HTMLAttributes<HTMLDialogElement>)}
    >
      <div className="dialog-content">
        <div className="dialog-header">
          <h2 id="dialog-title">{t('modalTitle')}</h2>
          <button className="close-x-btn" onClick={onClose} aria-label={t('closeButton')}>
            &times;
          </button>
        </div>
        
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

        {uploading && (
          <div className="progress-container">
            <div className="progress-bar-wrapper">
              <div className="progress-bar" style={{ width: `${progress}%` }} />
            </div>
            <span className="progress-text">{t('uploadingText', { progress })}</span>
          </div>
        )}

        {message && (
          <div className={`message-alert ${message.isError ? 'error' : 'success'}`}>
            {message.text}
          </div>
        )}

        <div className="dialog-footer">
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onClose}
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
      </div>
    </dialog>
  );
};
