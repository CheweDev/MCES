import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import UserSidebar from "./UserSidebar.jsx";
import * as XLSX from "xlsx";
import supabase from "../Supabase.jsx";
import { RiFileExcel2Fill } from "react-icons/ri";
import { ImSpinner8 } from "react-icons/im";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData] = useState({
    last_name: "",
    first_name: "",
    middle_name: "",
    lrn: "",
    birthdate: "",
    sex: "Male",
    gradeLevel: "",
    section: "",
    school_year: "",
    adviser: "",
  });
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promotionData, setPromotionData] = useState({
    gradeLevel: "",
    section: "",
    school_year: "",
    adviser: "",
  });
  const [isPromoting, setIsPromoting] = useState(false);

  const modalRef = useRef(null);
  const promotionModalRef = useRef(null);

  const sections = [
    "Section A",
    "Section B",
    "Section C",
    "Section D",
    "Section E",
    "Section F",
  ];

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const gradeLevel = sessionStorage.getItem("grade_level");
        const section = sessionStorage.getItem("section");

        const { data, error } = await supabase
          .from("StudentData")
          .select("*")
          .eq("gradeLevel", gradeLevel)
          .eq("section", section);

        if (error) {
          console.error("Error fetching students:", error);
        } else {
          setStudents(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchStudents();
  }, []);

  const handleInputChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setFormError("");
  };

  const handleOpenModal = (student = null) => {
    setFormError("");

    if (student) {
      setSelectedStudent(student);
      setFormData(student);
    } else {
      setSelectedStudent(null);
      setFormData({
        last_name: "",
        first_name: "",
        middle_name: "",
        lrn: "",
        birthdate: "",
        sex: "Male",
        gradeLevel: "",
        section: "",
        school_year: "",
        adviser: "",
      });
    }
    modalRef.current?.showModal();
  };

  const checkForDuplicateLRN = async (lrn) => {
    try {
      const { data, error } = await supabase
        .from("StudentData")
        .select("lrn")
        .eq("lrn", lrn);

      if (error) {
        console.error("Error checking for duplicate LRN:", error);
        return false;
      }

      return data.length > 0;
    } catch (err) {
      console.error("Unexpected error checking LRN:", err);
      return false;
    }
  };

  const validateForm = () => {
    const requiredFields = [
      "last_name",
      "first_name",
      "lrn",
      "birthdate",
      "gradeLevel",
      "section",
      "school_year",
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        setFormError(`${field.replace("_", " ")} is required`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);

      if (!validateForm()) {
        setIsSubmitting(false);
        return;
      }

      const {
        last_name,
        first_name,
        middle_name,
        lrn,
        birthdate,
        sex,
        gradeLevel,
        section,
        school_year,
        adviser,
      } = formData;

      if (selectedStudent) {
        // Updating existing student
        try {
          const { error } = await supabase
            .from("StudentData")
            .update({
              last_name,
              first_name,
              middle_name,
              lrn,
              birthdate,
              sex,
              gradeLevel,
              section,
              school_year,
              adviser,
            })
            .eq("lrn", selectedStudent.lrn);

          if (error) {
            console.error("Error updating student:", error);
            setFormError("Failed to update student record");
          } else {
            window.location.reload();
          }
        } catch (err) {
          console.error("Unexpected error:", err);
          setFormError("An unexpected error occurred");
        }
      } else {
        // check for duplicate LRN first
        const isDuplicate = await checkForDuplicateLRN(lrn);

        if (isDuplicate) {
          setFormError(
            "This LRN already exists in the database. Please use a unique LRN."
          );
          setIsSubmitting(false);
          return;
        }

        try {
          // Insert into StudentData table
          const { error: studentError } = await supabase
            .from("StudentData")
            .insert([
              {
                last_name,
                first_name,
                middle_name,
                lrn,
                birthdate,
                sex,
                gradeLevel,
                section,
                school_year,
                adviser,
              },
            ]);

          if (studentError) {
            console.error("Error inserting student:", studentError);
            setFormError("Failed to add student record");
            setIsSubmitting(false);
            return;
          }

          // Insert into Advisory table
          const { error: advisoryError } = await supabase
            .from("Advisory")
            .insert([
              {
                lrn,
                grade: gradeLevel,
                section,
                adviser,
                school_year,
              },
            ]);

          if (advisoryError) {
            console.error("Error inserting advisory data:", advisoryError);
            // Optionally set a form error here
          }

          window.location.reload();
        } catch (err) {
          console.error("Unexpected error:", err);
          setFormError("An unexpected error occurred");
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAsExcel = () => {
    const filtered = students.filter((s) =>
      `${s.last_name} ${s.first_name} ${s.middle_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_management.xlsx");
  };

  const filteredStudents = students
    .filter((s) =>
      `${s.last_name} ${s.first_name} ${s.middle_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const gradeLevelA = parseInt(a.gradeLevel.split(" ")[1]);
      const gradeLevelB = parseInt(b.gradeLevel.split(" ")[1]);

      if (gradeLevelA !== gradeLevelB) {
        return gradeLevelA - gradeLevelB;
      }

      return a.last_name.localeCompare(b.last_name);
    });

  const handleOpenPromotionModal = async (student) => {
    // Fetch grades for the student's current gradeLevel
    try {
      const { data: grades, error } = await supabase
        .from("Grades")
        .select("quarter")
        .eq("lrn", student.lrn)
        .eq("grade_level", student.gradeLevel);

      if (error) {
        alert("Error fetching grades for promotion check.");
        return;
      }

      const quarters = grades ? grades.map((g) => g.quarter) : [];
      const requiredQuarters = [
        "1st Quarter",
        "2nd Quarter",
        "3rd Quarter",
        "4th Quarter",
      ];
      const hasAllQuarters = requiredQuarters.every((q) =>
        quarters.includes(q)
      );

      if (!hasAllQuarters) {
        alert(
          "Cannot promote: Student does not have grades for all 4 quarters in their current grade level."
        );
        return;
      }

      setSelectedStudent(student);
      setPromotionData({
        gradeLevel: "",
        section: "",
        school_year: "",
        adviser: "",
      });
      promotionModalRef.current?.showModal();
    } catch (err) {
      alert("Unexpected error during promotion check.");
    }
  };

  const handlePromotionInputChange = (e) => {
    setPromotionData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePromotion = async () => {
    if (isPromoting) return;
    setIsPromoting(true);

    try {
      // Update StudentData
      const { error: studentError } = await supabase
        .from("StudentData")
        .update({
          gradeLevel: promotionData.gradeLevel,
          section: promotionData.section,
          school_year: promotionData.school_year,
        })
        .eq("lrn", selectedStudent.lrn);

      if (studentError) {
        alert("Error updating student record.");
        setIsPromoting(false);
        return;
      }

      // Insert into Advisory
      const { error: advisoryError } = await supabase.from("Advisory").insert([
        {
          lrn: selectedStudent.lrn,
          grade: promotionData.gradeLevel,
          section: promotionData.section,
          adviser: promotionData.adviser,
          school_year: promotionData.school_year,
        },
      ]);

      if (advisoryError) {
        alert("Error inserting advisory data.");
      }

      window.location.reload();
    } catch (err) {
      alert("Unexpected error during promotion.");
    } finally {
      setIsPromoting(false);
      promotionModalRef.current?.close();
    }
  };

  return (
    <div className="bg-gray-100 flex min-h-screen">
      <UserSidebar />
      <main className="flex-1 p-6 lg:ml-64">
        <div className="flex justify-between mt-2">
          <div className="mb-5">
            <h1 className="text-2xl font-bold text-gray-800">
              Student Records
            </h1>
            <p className="text-gray-600">View and Export Student Records</p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search by name"
              className="input input-bordered"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={() => handleOpenModal()}
            >
              + Add Student
            </button>
            <button
              className="btn btn-success text-white"
              onClick={handleSaveAsExcel}
            >
              <RiFileExcel2Fill />
              Save as Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-box border border-base-content/5 bg-white shadow-md">
          <table className="table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Last Name</th>
                <th>First Name</th>
                <th>Middle Name</th>
                <th>LRN</th>
                <th>Birthdate</th>
                <th>Sex</th>
                <th>Grade Level</th>
                <th>Section</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student, index) => (
                  <tr key={student.lrn}>
                    <th>{index + 1}</th>
                    <td>{student.last_name}</td>
                    <td>{student.first_name}</td>
                    <td>{student.middle_name}</td>
                    <td>{student.lrn}</td>
                    <td>{student.birthdate}</td>
                    <td>{student.sex}</td>
                    <td>{student.gradeLevel}</td>
                    <td>{student.section}</td>
                    <td className="flex gap-2">
                      <button
                        className="btn btn-sm btn-outline btn-info hover:text-white"
                        onClick={() => handleOpenModal(student)}
                      >
                        View Info
                      </button>
                      <button
                        className="btn btn-sm btn-outline btn-success hover:text-white"
                        onClick={() => handleOpenPromotionModal(student)}
                      >
                        Promote
                      </button>
                      <Link
                        to={{
                          pathname: "/user-grade",
                        }}
                        state={{
                          lrn: student.lrn,
                          gradeLevel: student.gradeLevel,
                          name: `${student.first_name} ${student.last_name}`,
                          section: student.section,
                        }}
                        className="btn btn-sm btn-outline btn-warning hover:text-white"
                      >
                        View Grades
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center text-gray-500">
                    No student records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Add/Edit Modal */}
        <dialog id="student_modal" className="modal" ref={modalRef}>
          <div className="modal-box">
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
            </form>
            <h3 className="font-bold text-lg mb-4 text-gray-800">
              {selectedStudent ? "View Student Information" : "Add Student"}
            </h3>

            {formError && (
              <div className="alert alert-error mb-4 text-sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <div className="form-control">
                <input
                  type="text"
                  name="last_name"
                  placeholder="Last Name"
                  value={formData.last_name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                  required
                />
              </div>

              <div className="form-control">
                <input
                  type="text"
                  name="first_name"
                  placeholder="First Name"
                  value={formData.first_name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                  required
                />
              </div>

              <div className="form-control">
                <input
                  type="text"
                  name="middle_name"
                  placeholder="Middle Name"
                  value={formData.middle_name}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                />
              </div>

              <div className="form-control">
                <input
                  type="text"
                  name="lrn"
                  placeholder="LRN"
                  value={formData.lrn}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                  required
                />
              </div>

              <div className="form-control">
                <input
                  type="date"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                  required
                />
              </div>

              <div className="form-control">
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                  disabled={!!selectedStudent}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              <div className="form-control">
                <select
                  name="gradeLevel"
                  value={formData.gradeLevel}
                  onChange={handleInputChange}
                  className="select select-bordered w-full"
                  required
                  disabled={!!selectedStudent}
                >
                  <option value="">Select Grade Level</option>
                  <option value="Grade 1">Grade 1</option>
                  <option value="Grade 2">Grade 2</option>
                  <option value="Grade 3">Grade 3</option>
                  <option value="Grade 4">Grade 4</option>
                  <option value="Grade 5">Grade 5</option>
                  <option value="Grade 6">Grade 6</option>
                </select>
              </div>

              <div className="form-control">
                <input
                  type="text"
                  name="section"
                  placeholder="Section"
                  value={formData.section}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  required
                  disabled={!!selectedStudent}
                />
              </div>

              <div className="form-control">
                <input
                  type="text"
                  name="adviser"
                  placeholder="Adviser Name"
                  value={formData.adviser}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                />
              </div>

              <div className="form-control">
                <input
                  type="text"
                  name="school_year"
                  placeholder="School Year (e.g., 2023-2024)"
                  value={formData.school_year}
                  onChange={handleInputChange}
                  className="input input-bordered w-full"
                  disabled={!!selectedStudent}
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                className="btn"
                onClick={() => modalRef.current.close()}
                type="button"
              >
                Close
              </button>
              {!selectedStudent && (
                <button
                  className="btn btn-primary text-white"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  type="button"
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    "Add"
                  )}
                </button>
              )}
            </div>
          </div>
        </dialog>

        {/* Promotion Modal */}
        <dialog id="promotion_modal" className="modal" ref={promotionModalRef}>
          <div className="modal-box">
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
                ✕
              </button>
            </form>
            <h3 className="font-bold text-lg mb-4 text-gray-800">
              Promote Student
            </h3>
            <div className="flex flex-col gap-3">
              <select
                name="gradeLevel"
                value={promotionData.gradeLevel}
                onChange={handlePromotionInputChange}
                className="select select-bordered w-full"
              >
                <option value="">Select Grade Level</option>
                <option value="Grade 1">Grade 1</option>
                <option value="Grade 2">Grade 2</option>
                <option value="Grade 3">Grade 3</option>
                <option value="Grade 4">Grade 4</option>
                <option value="Grade 5">Grade 5</option>
                <option value="Grade 6">Grade 6</option>
              </select>
              <select
                name="section"
                value={promotionData.section}
                onChange={handlePromotionInputChange}
                className="select select-bordered w-full"
              >
                <option value="">Select Section</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="school_year"
                placeholder="School Year (e.g., 2023-2024)"
                value={promotionData.school_year}
                onChange={handlePromotionInputChange}
                className="input input-bordered w-full"
              />
              <input
                type="text"
                name="adviser"
                placeholder="Adviser Name"
                value={promotionData.adviser}
                onChange={handlePromotionInputChange}
                className="input input-bordered w-full"
              />
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                className="btn"
                onClick={() => promotionModalRef.current.close()}
                disabled={isPromoting}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary text-white"
                onClick={handlePromotion}
                disabled={isPromoting}
              >
                {isPromoting ? (
                  <span className="flex items-center gap-2">
                    <ImSpinner8 className="animate-spin" />
                    Promoting...
                  </span>
                ) : (
                  "Promote"
                )}
              </button>
            </div>
          </div>
        </dialog>
      </main>
    </div>
  );
};

export default Students;
