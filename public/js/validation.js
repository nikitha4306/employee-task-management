// Frontend Form Validation Helper Functions

const FormValidator = {
    /**
     * Validate Task Form Data
     * Returns object: { isValid: boolean, errors: { [field]: string } }
     */
    validateTaskForm: function(data) {
        const errors = {};

        // 1. Task Title validation
        if (!data.title || data.title.trim() === '') {
            errors.title = 'Task title is required.';
        } else if (data.title.trim().length < 3) {
            errors.title = 'Task title must be at least 3 characters long.';
        }

        // 2. Due Date validation
        if (!data.dueDate || data.dueDate.trim() === '') {
            errors.dueDate = 'Due date is mandatory.';
        } else {
            const dateObj = new Date(data.dueDate);
            if (isNaN(dateObj.getTime())) {
                errors.dueDate = 'Please select a valid date.';
            }
        }

        // 3. Assigned Employee validation
        if (!data.assignedEmployeeId || data.assignedEmployeeId === '' || data.assignedEmployeeId === '0') {
            errors.assignedEmployeeId = 'Please select an assigned employee.';
        }

        // 4. Priority validation
        const validPriorities = ['Low', 'Medium', 'High'];
        if (!data.priority || !validPriorities.includes(data.priority)) {
            errors.priority = 'Priority must be Low, Medium, or High.';
        }

        // 5. Status validation
        const validStatuses = ['Pending', 'In Progress', 'Completed'];
        if (!data.status || !validStatuses.includes(data.status)) {
            errors.status = 'Status must be Pending, In Progress, or Completed.';
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors
        };
    },

    /**
     * Display validation errors under form inputs
     */
    showErrors: function(errors, formElement) {
        // Clear previous error messages
        formElement.querySelectorAll('.error-text').forEach(el => el.remove());
        formElement.querySelectorAll('.form-control').forEach(el => el.style.borderColor = '');

        Object.keys(errors).forEach(fieldKey => {
            const inputField = formElement.querySelector(`[name="${fieldKey}"]`) || formElement.querySelector(`#${fieldKey}`);
            if (inputField) {
                inputField.style.borderColor = '#dc2626';
                const errorSpan = document.createElement('small');
                errorSpan.className = 'error-text';
                errorSpan.style.color = '#dc2626';
                errorSpan.style.fontSize = '0.8rem';
                errorSpan.style.marginTop = '4px';
                errorSpan.style.display = 'block';
                errorSpan.innerText = errors[fieldKey];
                inputField.parentNode.appendChild(errorSpan);
            }
        });
    },

    /**
     * Clear all validation errors from form
     */
    clearErrors: function(formElement) {
        if (!formElement) return;
        formElement.querySelectorAll('.error-text').forEach(el => el.remove());
        formElement.querySelectorAll('.form-control').forEach(el => el.style.borderColor = '');
    }
};
