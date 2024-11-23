import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UploadForm() {
  const [file, setFile] = useState(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState(null); // State to store uploaded file info
  const [metadata, setMetadata] = useState([]);
  const [downloadLinks, setDownloadLinks] = useState({});
  const [showFiles, setShowFiles] = useState(false);

  useEffect(() => {
    const fetchInitialMetadata = async () => {
      try {
        const response = await axios.get('/api/metadata');
        const filesWithPassword = response.data.map((file) => ({
          ...file,
          setupPassword: false,
          password: '',
        }));
        setMetadata(filesWithPassword);
      } catch (err) {
        console.error(err);
        alert('Failed to fetch initial file metadata. Please try again.');
      }
    };
    fetchInitialMetadata();
  }, []);

  // const handleUpload = async () => {
  //   if (!file) {
  //     alert('Please select a file to upload.');
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append('file', file);

  //   try {
  //     const response = await axios.post('/api/upload', formData);
  //     alert(response.data.message);
      
  //     // Ensure you're getting the filepath from the response
  //     const newFileInfo = { 
  //       filename: file.name, 
  //       size: file.size, 
  //       filepath: response.data.filepath // Adjust based on your API response structure
  //     };

  //     console.log("Newly Uploaded File Info:", newFileInfo); // Debug log

  //     setUploadedFileInfo(newFileInfo); 
  //     fetchMetadata(newFileInfo); // Fetch metadata including new file
  //   } catch (err) {
  //     console.error(err);
  //     alert('File upload failed. Please try again.');
  //   }
  // };

  const handleUpload = async () => {
    if (!file) {
        alert('Please select a file to upload.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post('/api/upload', formData);
        alert(response.data.message);
        
        // Accessing filepath from the metadata object returned by the backend
        const newFileInfo = { 
            filename: file.name, 
            size: file.size, 
            filepath: response.data.metadata.filepath // Adjusted to access filepath correctly
        };

        console.log("Newly Uploaded File Info:", newFileInfo); // Debug log

        setUploadedFileInfo(newFileInfo); 
        fetchMetadata(newFileInfo); // Fetch metadata including new file
    } catch (err) {
        console.error(err);
        alert('File upload failed. Please try again.');
    }
};

  const fetchMetadata = async (newFile) => {
    try {
      const response = await axios.get('/api/metadata');
      const filesWithPassword = response.data.map((file) => ({
        ...file,
        setupPassword: false,
        password: '',
      }));

      if (newFile) {
        filesWithPassword.unshift({
          ...newFile,
          setupPassword: false,
          password: '',
        });
      }

      setMetadata(filesWithPassword);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch file metadata. Please try again.');
    }
  };

  const handleConvert = async (file) => {
    try {
      console.log("Converting File:", file); // Debug log

      const payload = {
        filepath: file.filepath,
        setup_password: file.setupPassword,
        ...(file.setupPassword && { password: file.password }),
      };

      console.log("Payload for Conversion:", payload); // Debug log

      const response = await axios.post('/api/convert', payload, { responseType: 'blob' });
      
      if (response.status === 200) {
        const url = URL.createObjectURL(new Blob([response.data]));
        
        setDownloadLinks((prevLinks) => ({
          ...prevLinks,
          [file.filename]: url,
        }));
      } else {
        alert('Conversion failed with status: ' + response.status);
      }
    } catch (err) {
      console.error(err);
      alert('File conversion failed. Please try again.');
    }
  };

  // Toggle password setup for existing files
  const togglePasswordSetup = (index) => {
    const updatedMetadata = [...metadata];
    updatedMetadata[index].setupPassword = !updatedMetadata[index].setupPassword;
    setMetadata(updatedMetadata);
  };

  // Update password for existing files
  const updatePassword = (index, value) => {
    const updatedMetadata = [...metadata];
    updatedMetadata[index].password = value;
    setMetadata(updatedMetadata);
  };

  return (
    <div>
      <h2>Word to PDF Converter</h2>

      <div>
        <input type="file" onChange={(e) => setFile(e.target.files[0])} />
        <button onClick={handleUpload}>Upload</button>
      </div>

      {/* Display uploaded file info with options for conversion */}
      {uploadedFileInfo && (
        <div className="uploaded-file-info">
          <h4>Uploaded File:</h4>
          <p>{uploadedFileInfo.filename} ({uploadedFileInfo.size} bytes)</p>

          {/* Option to set up a password */}
          <div>
            <input
              type="checkbox"
              id="setup-password"
              onChange={(e) => setUploadedFileInfo({ ...uploadedFileInfo, setupPassword: e.target.checked })}
            />
            <label htmlFor="setup-password">Set up password for this PDF</label>
          </div>

          {uploadedFileInfo.setupPassword && (
            <div>
              <input
                type="password"
                placeholder="Enter password"
                onChange={(e) => setUploadedFileInfo({ ...uploadedFileInfo, password: e.target.value })}
              />
            </div>
          )}

          {/* Button to convert the uploaded file */}
          <button onClick={() => handleConvert({ 
            filename: uploadedFileInfo.filename, 
            filepath: uploadedFileInfo.filepath,
            setupPassword: uploadedFileInfo.setupPassword,
            password: uploadedFileInfo.password 
          })}>
            Convert to PDF
          </button>

          {/* Show download link if it exists */}
          {downloadLinks[uploadedFileInfo.filename] && (
            <div>
              <a href={downloadLinks[uploadedFileInfo.filename]} download={`${uploadedFileInfo.filename}.pdf`}>
                Download PDF
              </a>
            </div>
          )}
        </div>
      )}

      <h3>History:</h3>

      <button onClick={() => setShowFiles(!showFiles)}>
        {showFiles ? 'Hide' : 'Show History'}
      </button>

      {showFiles && (
        <ul>
          {metadata.map((file, index) => (
            <li key={file.filename}>
              {file.filename} ({file.size} bytes)
              <div>
                <input
                  type="checkbox"
                  id={`password-${file.filename}`}
                  checked={file.setupPassword}
                  onChange={() => togglePasswordSetup(index)}
                />
                <label htmlFor={`password-${file.filename}`}>
                  Set up password for this PDF
                </label>
              </div>
              {file.setupPassword && (
                <div>
                  <input
                    type="password"
                    placeholder="Enter password"
                    value={file.password}
                    onChange={(e) => updatePassword(index, e.target.value)}
                  />
                </div>
              )}
              <button onClick={() => handleConvert(file)}>Convert to PDF</button>

              {/* Show download link if it exists */}
              {downloadLinks[file.filename] && (
                <div>
                  <a href={downloadLinks[file.filename]} download={`${file.filename}.pdf`}>
                    Download PDF
                  </a>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default UploadForm;