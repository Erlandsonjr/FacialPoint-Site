import React from 'react';
import ReactDOM from 'react-dom';

function LoadingSpinner({ message = "Processando cadastro..." }) {
    return ReactDOM.createPortal(
        <div className="loading-spinner-overlay">
            <div className="loading-content">
                <div className="spinner-container">
                    <div className="spinner-ring"></div>
                    <div className="spinner-inner"></div>
                    <div className="spinner-center"></div>
                </div>
                <div className="loading-message">
                    <p>{message}</p>
                </div>
            </div>
        </div>,
        document.body
    );
}

export default LoadingSpinner;