export const templates = [
	{
		title: "Table of Contents",
		description: "Inserts a structured table of contents",
		content: `
						<div class="note toc-note">
							<h2>תוכן עניינים</h2>
							<nav aria-label="תוכן עניינים">
								<ul class="toc-list">
									<li><a href="#section-1">נושא ראשון</a></li>
									<li><a href="#section-2">נושא שני</a></li>
								</ul>
							</nav>
						</div>
						<p>&nbsp;</p>
					`,
	},
	{
		title: "Note",
		description: "Inserts a note with a bold intro and normal text",
		content: `
						<div class="note">
							<p><strong>שימו לב:</strong> <span style="font-weight: normal;">כתבו כאן את ההערה</span></p>
						</div>
						<p>&nbsp;</p>
					`,
	},
];
