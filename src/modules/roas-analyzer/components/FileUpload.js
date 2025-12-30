import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import '../styles/global.css';

/**
 * 파일 업로드 컴포넌트
 * 드래그 앤 드롭 및 클릭 업로드 지원
 */
const FileUpload = ({ onFileUpload, onError }) => {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // 파일 타입 검증
      const validExtensions = ['.xlsx', '.xls', '.csv'];
      const fileName = file.name.toLowerCase();
      const isValidType = validExtensions.some((ext) => fileName.endsWith(ext));

      if (!isValidType) {
        onError?.('지원하지 않는 파일 형식입니다. .xlsx, .xls, .csv 파일만 업로드 가능합니다.');
        return;
      }

      // 파일 크기 검증 (10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        onError?.('파일 크기가 너무 큽니다. 10MB 이하의 파일만 업로드 가능합니다.');
        return;
      }

      setUploading(true);

      try {
        await onFileUpload(file);
      } catch (error) {
        onError?.(error.message || '파일 업로드 중 오류가 발생했습니다.');
      } finally {
        setUploading(false);
      }
    },
    [onFileUpload, onError]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/csv': ['.csv'],
    },
    multiple: false,
    disabled: uploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`roas-upload-area ${isDragActive ? 'dragging' : ''}`}
      style={{
        opacity: uploading ? 0.6 : 1,
        cursor: uploading ? 'not-allowed' : 'pointer',
      }}
    >
      <input {...getInputProps()} />

      <div style={{ textAlign: 'center' }}>
        {uploading ? (
          <>
            <div
              style={{
                fontSize: '48px',
                marginBottom: '16px',
                animation: 'spin 1s linear infinite',
              }}
            >
              ⏳
            </div>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#2D3748', margin: 0 }}>
              파일 처리 중...
            </p>
          </>
        ) : isDragActive ? (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
            <p style={{ fontSize: '18px', fontWeight: 600, color: '#0967D2', margin: 0 }}>
              여기에 파일을 놓으세요
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <p
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#2D3748',
                marginBottom: '8px',
              }}
            >
              엑셀 파일을 여기에 드래그하거나 클릭하여 업로드
            </p>
            <p style={{ fontSize: '14px', color: '#718096', margin: 0 }}>
              지원 형식: .xlsx, .xls, .csv (최대 10MB)
            </p>
            <p style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '16px' }}>
              필수 컬럼: 날짜, 광고비, 매출, 전환수, 클릭수
            </p>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default FileUpload;
