$(document).ready(function () {
  const itemsPerPage = 10;
  let currentPage = 1;

  // Initialize modals only after modals.html is loaded
  function initializeModals() {
    const addModalElement = $("#add-modal")[0];
    const editModalElement = $("#edit-modal")[0];

    if (addModalElement && editModalElement) {
      const addModal = new bootstrap.Modal(addModalElement);
      const editModal = new bootstrap.Modal(editModalElement);

      // Add user form submission
      $("#add-form").on("submit", async function (e) {
        e.preventDefault();
        const name = $("#add-user-name").val();
        const email = $("#add-user-email").val();

        try {
          const response = await fetch("http://localhost:3000/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ Name: name, Email: email }),
          });

          if (!response.ok) {
            throw new Error("Failed to add user");
          }

          addModal.hide();
          fetchData();
        } catch (error) {
          console.error("Error adding user:", error);
        }
      });

      // Edit user form submission
      $("#edit-form").on("submit", async function (e) {
        e.preventDefault();
        const id = $("#edit-user-id").val();
        const name = $("#edit-user-name").val();
        const email = $("#edit-user-email").val();
        const customerId = $("#edit-user-customer-id").val();

        try {
          const response = await fetch(`http://localhost:3000/users/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              Name: name,
              Email: email,
              CustomerID: customerId,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to update user");
          }

          editModal.hide();
          fetchData();
        } catch (error) {
          console.error("Error editing user:", error);
        }
      });

      // Delete user inside edit modal
      $("#delete-user-button").on("click", async function () {
        const id = $("#edit-user-id").val();

        try {
          const response = await fetch(`http://localhost:3000/users/${id}`, {
            method: "DELETE",
          });

          if (!response.ok) {
            throw new Error("Failed to delete user");
          }

          editModal.hide();
          fetchData();
        } catch (error) {
          console.error("Error deleting user:", error);
        }
      });

      // Modal opening functions (Global scope)
      window.openAddModal = () => addModal.show();
      window.openEditModal = (id, name, email, customerId) => {
        $("#edit-user-id").val(id);
        $("#edit-user-name").val(name);
        $("#edit-user-email").val(email);
        $("#edit-user-customer-id").val(customerId);

        editModal.show();
      };
    } else {
      console.error("Modals are not found in the DOM.");
    }
  }

  // Load modals and initialize them after loading
  $.get("modals.html", function (html) {
    $("#modals-placeholder").html(html);
    initializeModals(); // Run after the HTML content is injected
  }).fail(function () {
    console.error("Error loading modals.");
  });

  // Fetch and display data with pagination
  async function fetchData(page = 1) {
    currentPage = page;

    try {
      const response = await fetch("http://localhost:3000/users");
      const data = await response.json();

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const tableBody = $("#data-table tbody");
      tableBody.empty();

      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage;
      const paginatedData = data.slice(start, end);

      paginatedData.forEach((user) => {
        const row = `
                    <tr>
                        <td>${user.ID}</td>
                        <td>${user.Name}</td>
                        <td>${user.Email}</td>
                        <td>${user.CustomerID}</td>
                        <td>
                            <button class="btn btn-sm action-button" onclick="openEditModal(${user.ID}, '${user.Name}', '${user.Email}', '${user.CustomerID}')">
                                <i class="bi bi-pencil-square action-icon"></i>
                            </button>
                        </td>
                    </tr>
                `;
        tableBody.append(row);
      });

      updatePaginationControls(data.length);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  // Update pagination controls
  function updatePaginationControls(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginationControls = $("#pagination-controls");
    paginationControls.empty();

    for (let i = 1; i <= totalPages; i++) {
      const pageItem = $(
        `<li class="page-item ${
          i === currentPage ? "active" : ""
        }"><a class="page-link" href="#">${i}</a></li>`
      );
      pageItem.on("click", () => fetchData(i));
      paginationControls.append(pageItem);
    }
  }

  // Sidebar toggle for mobile devices
  const toggleButton = document.getElementById("sidebar-toggle");
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.querySelector(".main-content");

  toggleButton.addEventListener("click", function () {
    sidebar.classList.toggle("show");
    mainContent.classList.toggle("collapsed");
  });

  // Handle sidebar menu item clicks
  const menuItems = document.querySelectorAll("#sidebar-menu .nav-link");
  menuItems.forEach((item) => {
    item.addEventListener("click", function (event) {
      event.preventDefault();

      menuItems.forEach((link) => link.classList.remove("active"));
      item.classList.add("active");

      const target = item.getAttribute("data-target");
      showContent(target);
    });
  });

  // Function to dynamically load content into #content-placeholder
  function showContent(target) {
    $("#content-placeholder").load(`${target}.html`, function () {
      if (target === "users") fetchData();
    });
  }

  // Load initial content (Dashboard)
  $("#content-placeholder").load("dashboard.html");
});
