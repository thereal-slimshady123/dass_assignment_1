import { useEffect } from "react";
import { useNavigate } from 'react-router-dom'

export default function Organizer() {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to new organizer dashboard
        navigate('/organizer-dashboard');
    }, [navigate]);

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <p>Redirecting to Organizer Dashboard...</p>
        </div>
    );
}