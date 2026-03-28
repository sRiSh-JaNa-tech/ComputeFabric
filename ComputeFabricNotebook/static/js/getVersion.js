const versionContainer = document.getElementById("pyText");

document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch('http://localhost:8000/get_version');

        if (response.ok) {
            const data = await response.json(); // ✅ await added
            versionContainer.textContent = data.version;
        } else {
            versionContainer.textContent = 'Cannot get version';
        }

    } catch (err) {
        console.error(err); // ✅ helpful for debugging
        versionContainer.textContent = 'Error fetching version';
    }
});