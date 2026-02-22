function toggleAll(source) {
    const checkboxes = document.querySelectorAll('input.selectBox');
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = source.checked;
    }
}

$(document).ready(function() {
    $('#btn-apply').on('click', async function() {
        const selectedIds = [];
        let hasUnsubmitted = false;
        const unsubmittedNames = [];

        // Check each selected checkbox
        $('.selectBox:checked').each(function() {
            const $row = $(this).closest('tr');
            const submittedStatus = $row.find('td:eq(2)').text().trim(); // YEARBOOK column
            const schoolName = $row.find('td:eq(1)').text().trim(); // SCHOOL NAME column

            if (submittedStatus === 'Submitted' || loginUserId === 'admin1') {
                selectedIds.push($(this).val());
            } else {
                hasUnsubmitted = true;
                unsubmittedNames.push(schoolName);
            }
        });

        // If no valid selections
        if (selectedIds.length === 0) {
            if (hasUnsubmitted) {
                alert('The following selected users have not submitted their yearbooks and cannot be downloaded:\n' + unsubmittedNames.join(', '));
            } else {
                alert('Please select at least one user with a submitted yearbook.');
            }
            return;
        }

        // If some selections are unsubmitted, warn the user
        if (hasUnsubmitted) {
            alert('Some selected users have not submitted their yearbooks and will be skipped:\n' + unsubmittedNames.join(', ') + 
                  '\n\nProceeding with download for submitted users only.');
        }

        // Show loading spinner
        $('#loading-spinner').show();

        // Fetch API with timeout (5 minutes)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1800000); // 30분

        try {
            const downloadUrl = `${ctx}/admin/yearbook/download?ids=${selectedIds.join(',')}`;

            // Fetch the download in the background
            const response = await fetch(downloadUrl, {
                signal: controller.signal // For timeout
            });

            // Clear timeout on success
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            // Convert response to Blob
            const blob = await response.blob();
            
            // Trigger client-side download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'yearbook_files.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);

            alert("Download has started successfully.");
            location.reload(true);

        } catch (error) {
            if (error.name === 'AbortError') {
                alert('The request timed out. Please try again.');
            } else {
                alert(`An error occurred during download: ${error.message}`);
            }
        } finally {
            // Hide loading spinner
            $('#loading-spinner').hide();
        }
    });
});