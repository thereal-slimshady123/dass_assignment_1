import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

// Backend persistence: POST /api/preferences with Bearer token; falls back to localStorage if unavailable.
const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

const areaOptions = [
	 "Music"
    ,"Dance"
    , "Sports"
    , "Coding"
    , "Art"
    , "Literature"
    , "Culture"
    , "Tech"
    , "Entrepreneurship"
    , "Gaming"
];

const clubOptions = [
	"Coding Club",
	"Robotics Club",
	"Entrepreneurship Cell",
	"Design Club",
	"The Gaming Club",
	"ASEC",
    "Music Club",
    "The Dance Crew",
    "LitClub"
];

export default function Interests() {
	const navigate = useNavigate();
	const [areas, setAreas] = useState([]);
	const [clubs, setClubs] = useState([]);
	const [saving, setSaving] = useState(false);
	const [msg, setMsg] = useState("");

	const storedPrefs = useMemo(() => {
		try {
			return JSON.parse(localStorage.getItem("preferences") || "{}");
		} catch {
			return {};
		}
	}, []);

	useEffect(() => {
		if (storedPrefs.areas) setAreas(storedPrefs.areas);
		if (storedPrefs.clubs) setClubs(storedPrefs.clubs);
	}, [storedPrefs]);

	const toggle = (value, list, setList) => {
		if (list.includes(value)) {
			setList(list.filter((item) => item !== value));
		} else {
			setList([...list, value]);
		}
	};

	const savePrefs = async () => {
		setSaving(true);
		setMsg("");
		const payload = { areas, clubs };
		try {
			const token = localStorage.getItem("token");
			if (!token) {
				throw new Error("Not authenticated");
			}
			await axios.post(`${API_BASE}/preferences`, payload, {
				headers: {
					Authorization: `Bearer ${token}`
				}
			});
			localStorage.setItem("preferences", JSON.stringify(payload));
			navigate("/user");
		} catch (err) {
			localStorage.setItem("preferences", JSON.stringify(payload));
			setMsg("Saved locally. Please check your connection or sign in again.");
			setTimeout(() => navigate("/user"), 400);
		} finally {
			setSaving(false);
		}
	};

	const skip = () => {
		navigate("/user");
	};

	return (
		<div style={styles.container}>
			<div style={styles.card}>
				<h2 style={styles.title}>Tell us your interests</h2>
				<p style={styles.subtitle}>
					You can change these later in your profile. Select all that apply.
				</p>

				<section style={styles.section}>
					<div style={styles.sectionHeader}>
						<h3 style={styles.sectionTitle}>Areas of Interest</h3>
						<span style={styles.hint}>Multi-select</span>
					</div>
					<div style={styles.grid}>
						{areaOptions.map((option) => (
							<button
								key={option}
								type="button"
								onClick={() => toggle(option, areas, setAreas)}
								style={{
									...styles.chip,
									...(areas.includes(option) ? styles.chipActive : {})
								}}
							>
								{option}
							</button>
						))}
					</div>
				</section>

				<section style={styles.section}>
					<div style={styles.sectionHeader}>
						<h3 style={styles.sectionTitle}>Clubs / Organizers</h3>
						<span style={styles.hint}>Optional</span>
					</div>
					<div style={styles.grid}>
						{clubOptions.map((option) => (
							<button
								key={option}
								type="button"
								onClick={() => toggle(option, clubs, setClubs)}
								style={{
									...styles.chip,
									...(clubs.includes(option) ? styles.chipActive : {})
								}}
							>
								{option}
							</button>
						))}
					</div>
				</section>

				{msg && <div style={styles.error}>{msg}</div>}

				<div style={styles.actions}>
					<button onClick={skip} style={styles.secondaryBtn} type="button">
						Skip for now
					</button>
					<button
						onClick={savePrefs}
						style={styles.primaryBtn}
						type="button"
						disabled={saving}
					>
						{saving ? "Saving..." : "Save and Continue"}
					</button>
				</div>
			</div>
		</div>
	);
}

const styles = {
	container: {
		minHeight: "100vh",
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
		background: "#f4f6fb",
		padding: "24px"
	},
	card: {
		width: "100%",
		maxWidth: "720px",
		background: "#fff",
		borderRadius: "12px",
		padding: "24px",
		boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
		display: "flex",
		flexDirection: "column",
		gap: "18px"
	},
	title: {
		margin: 0,
		fontSize: "22px",
		color: "#111",
		fontWeight: 700
	},
	subtitle: {
		margin: 0,
		color: "#4a5568",
		fontSize: "14px"
	},
	section: {
		display: "flex",
		flexDirection: "column",
		gap: "12px"
	},
	sectionHeader: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center"
	},
	sectionTitle: {
		margin: 0,
		fontSize: "16px",
		color: "#1a202c",
		fontWeight: 600
	},
	hint: {
		fontSize: "12px",
		color: "#718096"
	},
	grid: {
		display: "grid",
		gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
		gap: "10px"
	},
	chip: {
		padding: "10px 12px",
		borderRadius: "10px",
		border: "1px solid #dce0e6",
		background: "#fff",
		color: "#2d3748",
		cursor: "pointer",
		textAlign: "left",
		transition: "all 0.15s ease"
	},
	chipActive: {
		borderColor: "#4c6fff",
		background: "#eef2ff",
		color: "#1e3a8a",
		boxShadow: "0 0 0 3px rgba(76,111,255,0.15)"
	},
	actions: {
		display: "flex",
		justifyContent: "flex-end",
		gap: "10px",
		marginTop: "4px"
	},
	primaryBtn: {
		padding: "10px 16px",
		background: "#4c6fff",
		color: "#fff",
		border: "none",
		borderRadius: "8px",
		cursor: "pointer",
		fontWeight: 600
	},
	secondaryBtn: {
		padding: "10px 14px",
		background: "#f1f5f9",
		color: "#1f2937",
		border: "1px solid #e2e8f0",
		borderRadius: "8px",
		cursor: "pointer",
		fontWeight: 500
	},
	error: {
		color: "#c53030",
		fontSize: "13px"
	}
};