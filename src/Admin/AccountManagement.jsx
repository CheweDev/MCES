import { useState, useRef, useEffect } from "react";
import AdminSidebar from "./AdminSidebar.jsx";
import * as XLSX from "xlsx";
import supabase from "../Supabase.jsx";
import { RiFileExcel2Fill } from "react-icons/ri";

const UserManagement = () => {
  const [usersData, setUsersData] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const modalRef = useRef(null);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase.from("Users").select("*");
        if (error) {
          console.error("Error fetching users:", error);
        } else {
          setUsersData(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchUsers();
  }, []);

  const openModal = (user) => {
    setSelectedUser(user);
    modalRef.current?.showModal();
  };

  const handleBlockUnblockUser = async (action) => {
    try {
      const { error } = await supabase
        .from("Users")
        .update({ status: action === "block" ? "Blocked" : "Active" })
        .eq("id", selectedUser.id);

      if (error) {
        console.error("Error updating user status:", error);
      } else {
        const updatedUsersData = usersData.map((user) =>
          user.id === selectedUser.id
            ? { ...user, status: action === "block" ? "Blocked" : "Active" }
            : user
        );
        setUsersData(updatedUsersData);
        console.log(`${action} user: ${selectedUser.name}`);
        modalRef.current.close();
        setSelectedUser(null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    }
  };

  const handleSaveAsExcel = () => {
    const filteredUsersData = usersData.filter((user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const ws = XLSX.utils.json_to_sheet(filteredUsersData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Users");
    XLSX.writeFile(wb, "user_management.xlsx");
  };

  const filteredUsers = usersData.filter((user) =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <AdminSidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <div className="flex justify-between mt-2">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-800">
              User Management
            </h1>
            <p className="text-gray-600">
              Manage user accounts and block/unblock users.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="mb-4">
              <input
                type="text"
                className="input input-bordered w-full max-w-xs"
                placeholder="Search by name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              className="btn btn-success text-white"
              onClick={handleSaveAsExcel}
            >
              <RiFileExcel2Fill />
              Save as Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-box border border-base-content/5 bg-white shadow-md">
          <table className="table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user, index) => (
                  <tr key={user.id}>
                    <th>{index + 1}</th>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td
                      className={`font-bold ${
                        user.status === "Active" ? "text-success" : "text-error"
                      }`}
                    >
                      {user.status}
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${
                          user.status === "Active"
                            ? "btn-outline btn-error hover:text-white"
                            : "btn-outline btn-success hover:text-white"
                        }`}
                        onClick={() => openModal(user)}
                      >
                        {user.status === "Active" ? <>Block</> : <>Unblock</>}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Block/Unblock User Modal */}
        <dialog id="action_modal" className="modal" ref={modalRef}>
          <div className="modal-box">
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
            </form>
            <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2">
              {selectedUser?.status === "Active" ? (
                <>
                  <span className="text-error">🚫</span> Block User
                </>
              ) : (
                <>
                  <span className="text-success">🔓</span> Unblock User
                </>
              )}
            </h3>
            <p className="mb-6 text-gray-600">
              Are you sure you want to{" "}
              <span className="font-semibold">
                {selectedUser?.status === "Active" ? "block" : "unblock"}
              </span>{" "}
              <span className="text-gray-900 font-medium">
                {selectedUser?.name}
              </span>
              ? This action will immediately update their status.
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="btn btn-ghost"
                onClick={() => modalRef.current.close()}
              >
                Cancel
              </button>
              {selectedUser?.status === "Active" ? (
                <button
                  className="btn btn-error text-white"
                  onClick={() => handleBlockUnblockUser("block")}
                >
                  Block
                </button>
              ) : (
                <button
                  className="btn btn-success text-white"
                  onClick={() => handleBlockUnblockUser("unblock")}
                >
                  Unblock
                </button>
              )}
            </div>
          </div>
        </dialog>
      </main>
    </div>
  );
};

export default UserManagement;
