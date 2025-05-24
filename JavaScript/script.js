// Initialize summary object
const summary = {
    totalEntries: 0,
    totalColleges: 0,
    totalVacancies: 0,
    totalWomenInstitutes: 0,
    totalGovernmentInstitutes: 0,
    totalPrivateInstitutes: 0,
    instituteCategories: {}, // To store counts for each category
    instituteStates: {}, // Optional: To count institutes per state
    courseCategories: {}, // Optional: To count courses per category
    nbaAccreditedInstitutes: 0,
    nirfParticipatedInstitutes: 0,
    naacAccreditedInstitutes: 0,
};

// Helper sets to avoid double-counting for unique institutes
const uniqueInstitutes = new Set();
const uniqueWomenInstitutes = new Set();
const uniqueGovernmentInstitutes = new Set();
const uniquePrivateInstitutes = new Set();
const uniqueNBAAccreditedInstitutes = new Set();
const uniqueNIRFParticipatedInstitutes = new Set();
const uniqueNAACAccreditedInstitutes = new Set();

let allCollegesData = [];
let filteredColleges = [];

// Function to load and Process JSON data
async function loadData() {
    try{
        const response = await fetch('Data/data.json');
        const data = await response.json();
        window.__originalFlatData = data;
        displayDataSummary(data);
        allCollegesData = groupCollegesByInstitute(data);
        filteredColleges = allCollegesData;
        renderFilters(window.__originalFlatData);
        renderCollegeCards(window.__originalFlatData, false);
    } catch (error) {
        console.error('Error loading data:', error);
        document.querySelector('.summary-content').innerHTML = 'Error loading data. Please try again later.';
    }
}

// Function to display data summary
function displayDataSummary(data) {
    const summaryContent = document.querySelectorAll('.summary-content');
    const overallSummary = summaryContent[0];
    const categorySummary = summaryContent[1];

    //1. Calculate total Entries
    const totalEntries = Array.isArray(data) ? data.length: Object.keys(data).length;

    //2. Calculate total Colleges
    data.forEach( entry => {

        if(!uniqueInstitutes.has(entry.instituteID)){
            summary.totalColleges++;
            uniqueInstitutes.add(entry.instituteID);

            // Now, we have to check for Women/Government/Accredited per unique institute
            // 3. Check for Women Institutes
            if(entry.isWomenInstitute === "Yes"){
                summary.totalWomenInstitutes++;
                uniqueWomenInstitutes.add(entry.instituteID);
            }

            // 4. Check for Government Institutes
            if(entry.typeOfInst === "Government"){
                summary.totalGovernmentInstitutes++;
                uniqueGovernmentInstitutes.add(entry.instituteID);
            }
            if(entry.typeOfInst === "Private"){
                summary.totalPrivateInstitutes++;
                uniquePrivateInstitutes.add(entry.instituteID);
            }

            // 5. Check for NBA Accredited Institutes
            if(entry.NBA_ACCREDIATED === "Yes"){
                summary.nbaAccreditedInstitutes++;
                uniqueNBAAccreditedInstitutes.add(entry.instituteID);
            }

            // 6. Check for NIRF Participated Institutes
            if(entry.PARTICATED_IN_NIRF === "Yes"){
                summary.nirfParticipatedInstitutes++;
                uniqueNIRFParticipatedInstitutes.add(entry.instituteID);
            }

            // 7. Check for NAAC Accredited Institutes
            if(entry.NAAC_ACCREDIATED === "Yes"){
                summary.naacAccreditedInstitutes++;
                uniqueNAACAccreditedInstitutes.add(entry.instituteID);
            }
        }

        // 8. Total Willingness (Total Seats)
        const willingness = parseInt(entry.willingness) || 0;
        summary.totalVacancies += willingness;

        // 9. Institute Categories
        const category = entry.instituteCategory;
        summary.instituteCategories[category] = (summary.instituteCategories[category] || 0) + 1;

        // 10. Institue State
        const state = entry.instituteState;
        summary.instituteStates[state] = (summary.instituteStates[state] || 0) + 1;

        // 11. Course Categories
        const courseCategory = entry.courseCategory;
        summary.courseCategories[courseCategory] = (summary.courseCategories[courseCategory] || 0) + 1;
    })
    
    // 12. Display the overall summary in webpage
    const summaryItems = [
        { label: 'Total Entries', value: totalEntries },
        { label: 'Total Colleges', value: summary.totalColleges },
        { label: 'Total Seats', value: summary.totalVacancies },
        { label: 'Total Women Institutes', value: summary.totalWomenInstitutes },
        { label: 'Total Government Institutes', value: summary.totalGovernmentInstitutes },
        { label: 'Total Private Institutes', value: summary.totalPrivateInstitutes },
        { label: 'Total NBA Accredited', value: summary.nbaAccreditedInstitutes },
        { label: 'Total NIRF Participated', value: summary.nirfParticipatedInstitutes },
        { label: 'Total NAAC Accredited', value: summary.naacAccreditedInstitutes }
    ];

    overallSummary.innerHTML = `
        <ul>
            ${summaryItems.map((item, index) => `
                <li style="--animation-order: ${index}">
                    <strong>${item.label}:</strong>
                    <span>${item.value.toLocaleString()}</span>
                </li>
            `).join('')}
        </ul>
    `;

    // Display category-wise summary
    const categoryItems = Object.entries(summary.instituteCategories)
        .sort((a, b) => b[1] - a[1]) // Sort by count in descending order
        .map(([category, count]) => {
            const totalWillingness = data
                .filter(entry => entry.instituteCategory === category)
                .reduce((sum, entry) => sum + (parseInt(entry.willingness) || 0), 0);
            return {
                label: category,
                value: count,
                willingness: totalWillingness
            };
        });

    categorySummary.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Count</th>
                    <th>Total Seats</th>
                </tr>
            </thead>
            <tbody>
                ${categoryItems.map(item => `
                    <tr>
                        <td>${item.label}</td>
                        <td>${item.value.toLocaleString()}</td>
                        <td>${item.willingness.toLocaleString()}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function groupCollegesByInstitute(data) {
    const colleges = {};
    data.forEach(entry => {
        if (!colleges[entry.instituteID]) {
            colleges[entry.instituteID] = {
                ...entry,
                courses: [],
                totalSeats: 0,
                lowestCutoff: null
            };
        }
        // Add course
        colleges[entry.instituteID].courses.push(entry);
        // Aggregate total seats
        const seatMatch = entry.vacancy && entry.vacancy.match(/(\d+)/);
        if (seatMatch) {
            colleges[entry.instituteID].totalSeats += parseInt(seatMatch[1], 10);
        }
        // Find lowest cutoff (ignore null/empty)
        if (entry.cutOff && !isNaN(entry.cutOff)) {
            const cutoff = parseFloat(entry.cutOff);
            if (
                colleges[entry.instituteID].lowestCutoff === null ||
                cutoff < colleges[entry.instituteID].lowestCutoff
            ) {
                colleges[entry.instituteID].lowestCutoff = cutoff;
            }
        }
    });
    return Object.values(colleges);
}

function renderFilters(data) {
    const filtersSection = document.querySelector('.filters-section');
    if (!filtersSection) return;
    // Get unique values
    const states = [...new Set(data.map(d => d.instituteState).filter(Boolean))].sort();
    const categories = [...new Set(data.map(d => d.instituteCategory).filter(Boolean))].sort();
    const types = [...new Set(data.map(d => d.typeOfInst).filter(Boolean))].sort();
    const courseNames = [...new Set(data.map(d => d.courseName).filter(Boolean))].sort();
    
    filtersSection.innerHTML = `
        <h2>Filters</h2>
        <div class="filters-row">
            <input type="text" id="filter-search" placeholder="Search by college name..." />
            <select id="filter-state"><option value="">All States</option>${states.map(s => `<option value="${s}">${s}</option>`).join('')}</select>
            <select id="filter-category"><option value="">All Categories</option>${categories.map(c => `<option value="${c}">${c}</option>`).join('')}</select>
            <select id="filter-type"><option value="">All Types</option>${types.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
            <select id="filter-accreditation">
                <option value="">All Accreditations</option>
                <option value="NBA">NBA</option>
                <option value="NAAC">NAAC</option>
                <option value="NIRF">NIRF</option>
            </select>
            <div class="filter-slider-group">
                <label for="filter-cutoff">Cutoff Range:</label>
                <input type="range" id="filter-cutoff" min="40" max="100" value="100" step="1" />
                <span id="filter-cutoff-value">≤ 100</span>
            </div>
            <select id="filter-sort-course">
                <option value="">Sort by Course Name</option>
                ${courseNames.map(course => `<option value="${course}">${course}</option>`).join('')}
            </select>
            <select id="filter-view">
                <option value="gallery">Gallery View</option>
                <option value="list">List View</option>
            </select>
        </div>
    `;
    // Add event listeners
    document.getElementById('filter-search').addEventListener('input', filterAndRenderColleges);
    document.getElementById('filter-state').addEventListener('change', filterAndRenderColleges);
    document.getElementById('filter-category').addEventListener('change', filterAndRenderColleges);
    document.getElementById('filter-type').addEventListener('change', filterAndRenderColleges);
    document.getElementById('filter-accreditation').addEventListener('change', filterAndRenderColleges);
    document.getElementById('filter-cutoff').addEventListener('input', function() {
        document.getElementById('filter-cutoff-value').textContent = `≤ ${this.value}`;
        filterAndRenderColleges();
    });
    document.getElementById('filter-sort-course').addEventListener('change', filterAndRenderColleges);
    document.getElementById('filter-view').addEventListener('change', filterAndRenderColleges);
}

function filterAndRenderColleges() {
    const search = document.getElementById('filter-search').value.toLowerCase();
    const state = document.getElementById('filter-state').value;
    const category = document.getElementById('filter-category').value;
    const type = document.getElementById('filter-type').value;
    const accreditation = document.getElementById('filter-accreditation').value;
    const cutoff = parseInt(document.getElementById('filter-cutoff').value, 10);
    const sortCourse = document.getElementById('filter-sort-course').value;

    // Filter the original flat data, not the grouped data
    const filteredFlat = window.__originalFlatData.filter(entry => {
        const hasAccreditation =
            !accreditation ||
            (accreditation === 'NBA' && entry.NBA_ACCREDIATED === 'Yes') ||
            (accreditation === 'NAAC' && entry.NAAC_ACCREDIATED === 'Yes') ||
            (accreditation === 'NIRF' && entry.PARTICATED_IN_NIRF === 'Yes');
        const passesCutoff =
            !entry.cutOff || isNaN(entry.cutOff) || parseFloat(entry.cutOff) <= cutoff;
        return (
            (!search || (entry.instituteName && entry.instituteName.toLowerCase().includes(search))) &&
            (!state || entry.instituteState === state) &&
            (!category || entry.instituteCategory === category) &&
            (!type || entry.typeOfInst === type) &&
            hasAccreditation &&
            passesCutoff
        );
    });

    // Regroup after filtering
    let grouped = groupCollegesByInstitute(filteredFlat);

    // Sort by course name if selected
    if (sortCourse) {
        grouped.sort((a, b) => {
            const aHasCourse = a.courses.some(course => course.courseName === sortCourse);
            const bHasCourse = b.courses.some(course => course.courseName === sortCourse);
            if (aHasCourse && !bHasCourse) return -1;
            if (!aHasCourse && bHasCourse) return 1;
            return 0;
        });
    }

    filteredColleges = grouped;
    renderCollegeCards(filteredColleges, true);
}

function renderCollegeCards(data, skipGroup) {
    const collegeCardContent = document.getElementById('college-card-content');
    if (!collegeCardContent) return;
    const colleges = skipGroup ? data : groupCollegesByInstitute(data);
    const view = document.getElementById('filter-view').value;

    if (view === 'list') {
        collegeCardContent.innerHTML = colleges.map((college, idx) => {
            const totalWillingness = college.courses.reduce((sum, course) => sum + (parseInt(course.willingness) || 0), 0);
            return `
            <div class="college-list-item" data-id="${college.instituteID}">
                <div class="college-list-name">${college.instituteName}</div>
                <div class="college-list-category">${college.instituteCategory}</div>
                <div class="college-list-willingness">Total Willingness: ${totalWillingness === 0 ? 'NA' : totalWillingness}</div>
            </div>
            `;
        }).join('');
    } else {
        collegeCardContent.innerHTML = colleges.map((college, idx) => {
            const totalWillingness = college.courses.reduce((sum, course) => sum + (parseInt(course.willingness) || 0), 0);
            return `
            <div class="college-card" data-id="${college.instituteID}">
                <div class="college-card-title">${college.instituteName}</div>
                <div class="college-card-location">${college.instituteState}, ${college.instituteDistrict}</div>
                <div class="college-card-topbar">
                    <span class="college-card-category-pill">${college.instituteCategory}</span>
                    <span class="college-card-cutoff-pill">lowest cutoff: ${college.lowestCutoff !== null ? college.lowestCutoff : 'NA'}</span>
                </div>
                <div class="college-card-table">
                    <div class="college-card-table-row">
                        <span>Courses:</span>
                        <span>${college.courses.length}</span>
                    </div>
                    <div class="college-card-table-row">
                        <span>Total Seats:</span>
                        <span>${totalWillingness === 0 ? 'NA' : totalWillingness}</span>
                    </div>
                    <div class="college-card-table-row">
                        <span>Category:</span>
                        <span>${college.typeOfInst}</span>
                    </div>
                </div>
                <div class="college-card-bottom">
                    <div class="college-card-badges">
                        ${college.PARTICATED_IN_NIRF === 'Yes' ? `<span class="badge badge-nirf">NIRF</span>` : ''}
                        ${college.NBA_ACCREDIATED === 'Yes' ? '<span class="badge badge-nba">NBA</span>' : ''}
                        ${college.NAAC_ACCREDIATED === 'Yes' ? '<span class="badge badge-naac">NAAC</span>' : ''}
                    </div>
                    <button class="more-info-btn" data-idx="${idx}">more info</button>
                </div>
            </div>
            `;
        }).join('');
    }
    document.querySelectorAll('.more-info-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const idx = this.getAttribute('data-idx');
            showCollegeModal(colleges[idx]);
        });
    });
}

function showCollegeModal(college) {
    let modal = document.getElementById('college-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'college-modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <h2>${college.instituteName}</h2>
            <div class="modal-meta">
                <div><strong>Institute ID:</strong> ${college.instituteID}</div>
                <div><strong>Address:</strong> ${college.instituteAddress}</div>
                <div><strong>State:</strong> ${college.instituteState}</div>
                <div><strong>District:</strong> ${college.instituteDistrict}</div>
                <div><strong>Type:</strong> ${college.typeOfInst}${college.isWomenInstitute === 'Yes' ? ' • Women' : ''}</div>
                <div><strong>Category:</strong> ${college.instituteCategory}</div>
                <div><strong>Region:</strong> ${college.instituteRegion}</div>
                <div><strong>NBA:</strong> ${college.NBA_ACCREDIATED}</div>
                <div><strong>NAAC:</strong> ${college.NAAC_ACCREDIATED}</div>
                <div><strong>NIRF:</strong> ${college.PARTICATED_IN_NIRF}</div>
                <div><strong>CGPA:</strong> ${college.CGPA || 'NA'}</div>
                <div><strong>Grade:</strong> ${college.grade || 'NA'}</div>
                <div><strong>Rank:</strong> ${college.RANK || 'NA'}</div>
            </div>
            <h3>Courses Offered</h3>
            <div class="modal-courses">
                <table>
                    <thead>
                        <tr>
                            <th>Course Name</th>
                            <th>Category</th>
                            <th>Cutoff</th>
                            <th>University</th>
                            <th>Total Seats</th>
                            <th>Allotted Students</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${college.courses.map(course => `
                            <tr>
                                <td>${course.courseName}</td>
                                <td>${course.courseCategory}</td>
                                <td>${course.cutOff !== null ? course.cutOff : 'NA'}</td>
                                <td>${course.university || 'NA'}</td>
                                <td>${course.willingness || 'NA'}</td>
                                <td>${course.allottedStudents || 'NA'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    modal.querySelector('.modal-close').onclick = closeCollegeModal;
    modal.querySelector('.modal-overlay').onclick = closeCollegeModal;
}

function closeCollegeModal() {
    const modal = document.getElementById('college-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

loadData();
