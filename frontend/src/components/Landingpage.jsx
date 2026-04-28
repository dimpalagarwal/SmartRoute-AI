/**
 * LandingPage
 * The marketing / hero page shown before entering the dashboard.
 */
export default function LandingPage({ onLaunch }) {
  const btnStyle = {
    padding: "14px 28px", borderRadius: "40px",
    background: "linear-gradient(135deg,#3B82F6,#06B6D4)",
    border: "none", color: "white", fontWeight: "600", cursor: "pointer", transition: "all 0.3s ease",
  };

  const cardHover = (enter) => (e) => {
    e.currentTarget.style.transform = enter ? "translateY(-8px)" : "translateY(0)";
    e.currentTarget.style.borderColor = enter ? "#3B82F6" : "rgba(59,130,246,0.2)";
    e.currentTarget.style.boxShadow = enter ? "0 12px 30px rgba(59,130,246,0.3)" : "none";
  };

  const stepHover = (enter) => (e) => {
    e.currentTarget.style.transform = enter ? "translateY(-10px)" : "translateY(0)";
    e.currentTarget.style.boxShadow = enter ? "0 15px 30px rgba(59,130,246,0.3)" : "none";
  };

  return (
    <div style={{ background: "#0A0F1A", color: "#E8EDF5", fontFamily: "Inter, sans-serif" }}>
      {/* Navbar */}
      <div style={{ padding: "20px 40px", display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
        <h2>SmartRoute <span style={{ color: "#3B82F6" }}>AI</span></h2>
        <button onClick={onLaunch} style={{ padding: "10px 20px", borderRadius: "30px", border: "1px solid #3B82F6", background: "transparent", color: "white", cursor: "pointer" }}>
          Launch App
        </button>
      </div>

      {/* Hero */}
      <div style={{ padding: "80px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "60px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "300px" }}>
          <h1 style={{ fontSize: "3.5rem", lineHeight: "1.2", background: "linear-gradient(135deg,#ffffff,#3B82F6,#06B6D4)", WebkitBackgroundClip: "text", color: "transparent" }}>
            Navigate smarter.<br />Optimize in real-time.
          </h1>
          <p style={{ marginTop: "20px", color: "#9CA3AF", maxWidth: "500px", fontSize: "1.05rem" }}>
            SmartRoute AI helps you predict risks, optimize delivery routes, and respond to disruptions instantly with a fully connected logistics system.
          </p>
          <div style={{ marginTop: "30px", display: "flex", gap: "16px" }}>
            <button
              onClick={onLaunch}
              style={btnStyle}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 10px 25px rgba(59,130,246,0.4)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              Launch Dashboard →
            </button>
            <button
              style={{ padding: "14px 28px", borderRadius: "40px", background: "transparent", border: "1px solid #3B82F6", color: "#3B82F6", fontWeight: "600", cursor: "pointer", transition: "all 0.3s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3B82F6"; e.currentTarget.style.color = "white"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3B82F6"; }}
            >
              See How It Works
            </button>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "300px" }}>
          <h3 style={{ marginBottom: "20px" }}>How the System Works</h3>
          {["Predict Risk Zones", "Optimize Routes", "Simulate Disruption", "Auto Re-route + Alerts"].map((step, i) => (
            <div
              key={i}
              style={{ background: "rgba(18,25,40,0.7)", padding: "16px", borderRadius: "14px", marginBottom: "12px", border: "1px solid rgba(59,130,246,0.2)", transition: "all 0.3s ease" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateX(8px)"; e.currentTarget.style.borderColor = "#3B82F6"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(59,130,246,0.25)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.2)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              {i + 1}. {step}
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}><h2>Features</h2></div>
      <div style={{ display: "flex", justifyContent: "center", padding: "0 20px 60px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "28px", maxWidth: "1000px", width: "100%" }}>
          {[
            { title: "Predictive Risk Engine", desc: "Detect high-risk zones using traffic & weather." },
            { title: "Route Optimization", desc: "Generate efficient delivery paths dynamically." },
            { title: "Disruption Simulation", desc: "Simulate accidents and reroute instantly." },
            { title: "Live Dashboard", desc: "Monitor vehicles and delivery status in real time." },
            { title: "Alerts System", desc: "Get instant delay and disruption notifications." },
            { title: "Fleet Tracking", desc: "Track all vehicles live on the map." },
          ].map((feature, i) => (
            <div key={i}
              style={{ background: "rgba(18,25,40,0.7)", padding: "28px", borderRadius: "22px", border: "1px solid rgba(59,130,246,0.2)", textAlign: "center", minHeight: "180px", display: "flex", flexDirection: "column", justifyContent: "center", transition: "all 0.3s ease", cursor: "pointer" }}
              onMouseEnter={cardHover(true)} onMouseLeave={cardHover(false)}
            >
              <h3 style={{ marginBottom: "10px" }}>{feature.title}</h3>
              <p style={{ fontSize: "0.9rem", color: "#9CA3AF" }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div style={{ padding: "80px 20px", background: "#0A0F1A", color: "#E5E7EB" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <h2>How It Works</h2>
          <p style={{ color: "#9CA3AF", marginTop: "10px", maxWidth: "600px", marginInline: "auto" }}>
            From fleet setup to intelligent rerouting — experience the flow of next-gen logistics AI
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px", maxWidth: "1200px", margin: "40px auto" }}>
          {[
            { title: "Setup fleet", desc: "Add vehicles, assign drivers, define start locations and delivery stops.", icon: "🚚" },
            { title: "Predict risk zones", desc: "Analyze traffic & weather to generate dynamic risk zones.", icon: "⚠️" },
            { title: "Optimize routes", desc: "AI generates efficient routes avoiding high-risk areas.", icon: "🛣️" },
            { title: "Simulate & reroute", desc: "Trigger disruptions and see real-time route changes.", icon: "🚨" },
          ].map((step, i) => (
            <div key={i}
              style={{ background: "rgba(18,25,40,0.7)", borderRadius: "20px", padding: "28px 20px", border: "1px solid rgba(59,130,246,0.2)", textAlign: "center", transition: "all 0.3s ease", cursor: "pointer" }}
              onMouseEnter={stepHover(true)} onMouseLeave={stepHover(false)}
            >
              <div style={{ width: "60px", height: "60px", borderRadius: "50%", margin: "0 auto 16px", background: "linear-gradient(135deg,#3B82F6,#06B6D4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "700", fontSize: "1.2rem" }}>
                {i + 1}
              </div>
              <h3 style={{ marginBottom: "8px" }}>{step.icon} {step.title}</h3>
              <p style={{ color: "#9CA3AF", fontSize: "0.9rem" }}>{step.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ maxWidth: "800px", margin: "0 auto", background: "rgba(15,23,42,0.9)", borderRadius: "30px", padding: "40px", textAlign: "center", border: "1px solid rgba(59,130,246,0.3)", boxShadow: "0 20px 40px rgba(0,0,0,0.4)" }}>
          <h3 style={{ fontSize: "1.8rem", marginBottom: "10px", background: "linear-gradient(135deg,#ffffff,#93C5FD)", WebkitBackgroundClip: "text", color: "transparent" }}>
            🚀 Experience intelligent routing
          </h3>
          <p style={{ color: "#9CA3AF", marginBottom: "20px" }}>
            Try the full interactive demo — predict risk, optimize, and simulate disruptions in real time.
          </p>
          <button
            onClick={onLaunch}
            style={{ padding: "14px 30px", borderRadius: "40px", background: "linear-gradient(135deg,#3B82F6,#06B6D4)", color: "white", border: "none", fontWeight: "600", cursor: "pointer", transition: "0.3s" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = "0 12px 25px rgba(59,130,246,0.4)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            Try Live Demo →
          </button>
          <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
            {[
              { bg: "rgba(59,130,246,0.15)", text: "✔ Real-time alerts" },
              { bg: "rgba(6,182,212,0.15)", text: "📊 On-time KPIs" },
              { bg: "rgba(168,85,247,0.15)", text: "📍 Smart routing" },
            ].map((tag) => (
              <span key={tag.text} style={{ background: tag.bg, padding: "6px 14px", borderRadius: "20px", fontSize: "0.8rem" }}>
                {tag.text}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}