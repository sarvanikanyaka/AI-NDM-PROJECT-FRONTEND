import { AlertCircle, CheckCircle2, FileCheck2, FileUp, Loader2, ShieldCheck } from 'lucide-react';
import { useRef, useState } from 'react';

function Upload({ onReview, loading, error, apiStatus }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleFile = (file) => {
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileChange = (event) => {
    handleFile(event.target.files?.[0]);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (selectedFile) {
      onReview(selectedFile);
    }
  };

  return (
    <section className="uploadPanel glassCard staggerItem" aria-label="Upload NDA PDF">
      <div className="sectionTitle">
        <ShieldCheck size={18} />
        <h2>NDA Review</h2>
        <span className={`apiMiniStatus ${apiStatus}`}>
          {apiStatus === 'online' ? 'API connected' : 'Checking API'}
        </span>
      </div>
      <form onSubmit={handleSubmit}>
        <button
          className={`dropZone ${dragging ? 'dragging' : ''} ${selectedFile ? 'hasFile' : ''}`}
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={() => setDragging(true)}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          disabled={loading}
        >
          {selectedFile ? <FileCheck2 size={38} /> : <FileUp size={38} />}
          <span>{selectedFile ? selectedFile.name : 'Drop NDA PDF here'}</span>
          <small>
            {selectedFile ? (
              <>
                <CheckCircle2 size={14} />
                {`${Math.ceil(selectedFile.size / 1024)} KB ready`}
              </>
            ) : (
              'or click to browse'
            )}
          </small>
        </button>
        <input
          ref={inputRef}
          className="hiddenInput"
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        <button className={`primaryButton ${loading ? 'loading' : ''}`} type="submit" disabled={!selectedFile || loading}>
          {loading ? <Loader2 className="spin" size={18} /> : <FileUp size={18} />}
          <span>{loading ? 'Analyzing NDA' : 'Run Review'}</span>
        </button>
      </form>
      {error ? (
        <div className="errorBox" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      ) : null}
    </section>
  );
}

export default Upload;
