// 📁 src/components/InstallButton.jsx
import { useEffect, useRef, useState } from "react";

function InstallButton() {
  const deferredPrompt = useRef(null);
  const [showButton, setShowButton] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setShowButton(true);
      
      // Auto-show modal after 2 seconds (optional)
      setTimeout(() => {
        if (deferredPrompt.current) setShowModal(true);
      }, 2000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    window.addEventListener("appinstalled", () => {
      deferredPrompt.current = null;
      setShowButton(false);
      setShowModal(false);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const installApp = async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) return;

    promptEvent.prompt();
    const result = await promptEvent.userChoice;

    if (result.outcome === "accepted") {
      console.log("User installed the app");
      setShowModal(false);
    } else {
      console.log("User dismissed install");
    }

    deferredPrompt.current = null;
    setShowButton(false);
  };

  const dismissModal = () => {
    setShowModal(false);
  };

  // Styles
  const styles = {
    // Floating button styles
    floatingBtn: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 1000,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      border: "none",
      padding: "14px 28px",
      borderRadius: "40px",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "pointer",
      boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
      transition: "all 0.3s ease",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      fontFamily: "system-ui, -apple-system, sans-serif"
    },
    floatingBtnHover: {
      transform: "translateY(-2px)",
      boxShadow: "0 12px 28px rgba(102, 126, 234, 0.5)"
    },
    
    // Modal overlay
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(8px)",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      animation: "fadeIn 0.3s ease",
      fontFamily: "system-ui, -apple-system, sans-serif"
    },
    
    // Modal container
    modalContainer: {
      backgroundColor: "white",
      borderRadius: "24px",
      maxWidth: "400px",
      width: "90%",
      overflow: "hidden",
      boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      animation: "slideUp 0.3s ease"
    },
    
    // Modal header
    modalHeader: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      padding: "24px",
      textAlign: "center",
      color: "white"
    },
    
    modalIcon: {
      fontSize: "48px",
      marginBottom: "12px"
    },
    
    modalTitle: {
      fontSize: "24px",
      fontWeight: "bold",
      margin: "0 0 8px 0"
    },
    
    modalSubtitle: {
      fontSize: "14px",
      opacity: 0.9,
      margin: 0
    },
    
    // Modal body
    modalBody: {
      padding: "24px"
    },
    
    benefitList: {
      listStyle: "none",
      padding: 0,
      margin: 0
    },
    
    benefitItem: {
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "12px 0",
      borderBottom: "1px solid #f0f0f0"
    },
    
    benefitIcon: {
      fontSize: "20px",
      minWidth: "32px",
      textAlign: "center"
    },
    
    benefitText: {
      fontSize: "14px",
      color: "#333",
      lineHeight: 1.4
    },
    
    benefitTitle: {
      fontWeight: "bold",
      marginBottom: "4px"
    },
    
    benefitDesc: {
      fontSize: "12px",
      color: "#666"
    },
    
    // Modal footer
    modalFooter: {
      padding: "20px 24px 24px",
      display: "flex",
      gap: "12px"
    },
    
    installBtn: {
      flex: 1,
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      color: "white",
      border: "none",
      padding: "12px",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "bold",
      cursor: "pointer",
      transition: "all 0.2s ease"
    },
    
    laterBtn: {
      flex: 1,
      background: "white",
      color: "#666",
      border: "1px solid #ddd",
      padding: "12px",
      borderRadius: "12px",
      fontSize: "16px",
      fontWeight: "500",
      cursor: "pointer",
      transition: "all 0.2s ease"
    }
  };

  // Hover effects (handled via state)
  const [isHovered, setIsHovered] = useState(false);
  const [isInstallHovered, setIsInstallHovered] = useState(false);
  const [isLaterHovered, setIsLaterHovered] = useState(false);

  // Add animations to document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => document.head.removeChild(styleSheet);
  }, []);

  if (!showButton) return null;

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          ...styles.floatingBtn,
          ...(isHovered ? styles.floatingBtnHover : {})
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <span>📱</span>
        Install App
      </button>

      {/* Install Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={dismissModal}>
          <div style={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalIcon}>🚀</div>
              <h2 style={styles.modalTitle}>Install MillieFX App</h2>
              <p style={styles.modalSubtitle}>Trade better with our native app</p>
            </div>

            <div style={styles.modalBody}>
              <ul style={styles.benefitList}>
                <li style={styles.benefitItem}>
                  <span style={styles.benefitIcon}>⚡</span>
                  <div style={styles.benefitText}>
                    <div style={styles.benefitTitle}>Lightning Fast</div>
                    <div style={styles.benefitDesc}>2x faster than browser</div>
                  </div>
                </li>
                <li style={styles.benefitItem}>
                  <span style={styles.benefitIcon}>📶</span>
                  <div style={styles.benefitText}>
                    <div style={styles.benefitTitle}>Offline Trading</div>
                    <div style={styles.benefitDesc}>Trade even without internet</div>
                  </div>
                </li>
                <li style={styles.benefitItem}>
                  <span style={styles.benefitIcon}>🔔</span>
                  <div style={styles.benefitText}>
                    <div style={styles.benefitTitle}>Instant Alerts</div>
                    <div style={styles.benefitDesc}>Get price alerts instantly</div>
                  </div>
                </li>
                <li style={styles.benefitItem}>
                  <span style={styles.benefitIcon}>📱</span>
                  <div style={styles.benefitText}>
                    <div style={styles.benefitTitle}>One-Tap Access</div>
                    <div style={styles.benefitDesc}>Launch from home screen</div>
                  </div>
                </li>
              </ul>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={{
                  ...styles.laterBtn,
                  ...(isLaterHovered ? {
                    background: "#f5f5f5",
                    borderColor: "#ccc"
                  } : {})
                }}
                onClick={dismissModal}
                onMouseEnter={() => setIsLaterHovered(true)}
                onMouseLeave={() => setIsLaterHovered(false)}
              >
                Later
              </button>
              <button
                style={{
                  ...styles.installBtn,
                  ...(isInstallHovered ? {
                    transform: "translateY(-1px)",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.4)"
                  } : {})
                }}
                onClick={installApp}
                onMouseEnter={() => setIsInstallHovered(true)}
                onMouseLeave={() => setIsInstallHovered(false)}
              >
                Install Now 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default InstallButton;
