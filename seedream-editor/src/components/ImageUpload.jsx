import { useState } from 'react';
import './ImageUpload.css';

export default function ImageUpload({ images: imagesProp, onImagesChange, maxImages = 10 }) {
  const [internalImages, setInternalImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  // Ensure images is always an array
  const images = Array.isArray(imagesProp) ? imagesProp : internalImages;

  const updateImages = (nextImages) => {
    if (imagesProp === undefined) {
      setInternalImages(nextImages);
    }
    if (onImagesChange) {
      onImagesChange(nextImages);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);

    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    const updatedImages = [...images, ...newImages];
    updateImages(updatedImages);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (images.length + files.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`);
      return;
    }

    const newImages = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    const updatedImages = [...images, ...newImages];
    updateImages(updatedImages);
  };

  const removeImage = (id) => {
    const updatedImages = images.filter((img) => img.id !== id);

    // Clean up object URL
    const imageToRemove = images.find((img) => img.id === id);
    if (imageToRemove) {
      URL.revokeObjectURL(imageToRemove.preview);
    }

    updateImages(updatedImages);
  };

  const clearAll = () => {
    // Clean up all object URLs
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    updateImages([]);
  };

  return (
    <div className="image-upload">
      <div className="upload-header">
        <label className="upload-label">
          Reference Images (up to {maxImages})
        </label>
        {images.length > 0 && (
          <button type="button" className="btn-clear" onClick={clearAll}>
            Clear All
          </button>
        )}
      </div>

      <div
        className="upload-area"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-input"
          multiple
          accept="image/*"
          onChange={handleFileChange}
          className="file-input"
        />
        <label htmlFor="file-input" className={`file-label ${isDragging ? 'dragging' : ''}`}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>{isDragging ? 'Drop images here' : 'Click to upload or drag and drop'}</span>
          <small>PNG, JPG, WEBP up to 10MB</small>
        </label>
      </div>

      {images.length > 0 && (
        <div className="image-grid">
          {images.map((image, index) => (
            <div key={image.id} className="image-preview">
              <div className="image-number">Figure {index + 1}</div>
              <img src={image.preview} alt={`Preview ${index + 1}`} />
              <div className="image-info">
                <span className="image-name">{image.name}</span>
                <button
                  type="button"
                  className="btn-remove-image"
                  onClick={() => removeImage(image.id)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="upload-hint">
          Upload images from your computer or phone. Reference them as "Figure 1", "Figure 2", etc. in your prompt.
        </p>
      )}
    </div>
  );
}
