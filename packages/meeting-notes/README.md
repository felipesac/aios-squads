# Meeting Notes Assistant - AIOS Expansion Pack

**Version:** 1.0.0
**Author:** AIOS Team (Test)
**Status:** Test Example Pack

---

## Purpose

This expansion pack provides tools and agents for organizing, documenting, and tracking meeting notes and action items. It helps teams capture decisions, assign follow-ups, and maintain clear meeting records.

**This is a test pack created to validate the Expansion Creator Pack functionality.**

---

## When to Use This Pack

Use this expansion pack when you need to:

- Organize and document team meetings
- Capture meeting notes in a structured format
- Track action items and follow-ups
- Document decisions and their rationale
- Create professional meeting summaries
- Maintain meeting effectiveness and accountability

---

## What's Included

### Agents

1. **Morgan - Meeting Organization Specialist** (`@meeting-organizer`)
   - Helps organize meetings and capture notes
   - Tracks action items and decisions
   - Provides meeting facilitation guidance
   - Icon: 📝

### Tasks

1. **Create Meeting Notes** (`create-meeting-notes.md`)
   - Interactive workflow to create structured meeting notes
   - Captures attendees, agenda, discussions, decisions, and action items
   - Generates professional meeting documentation

### Templates

1. **Meeting Notes Template** (`meeting-notes-template.yaml`)
   - Structured format for meeting documentation
   - Includes metadata, agenda, discussions, decisions, and action items
   - Supports various meeting types (standup, planning, retrospective, etc.)

### Checklists

1. **Meeting Effectiveness Checklist** (`meeting-effectiveness-checklist.md`)
   - Pre-meeting preparation checklist
   - During-meeting quality checks
   - Post-meeting follow-up items
   - Decision and action item quality criteria

### Knowledge Bases

1. **Meeting Best Practices** (`meeting-best-practices.md`)
   - Meeting planning guidelines
   - Effective agenda creation
   - Note-taking methodologies
   - Action item management
   - Virtual meeting best practices
   - Meeting metrics and improvement strategies

---

## Installation

### Prerequisites

- AIOS-FULLSTACK framework v4.0+
- Access to expansion-packs directory

### Installation Steps

1. **Navigate to expansion packs directory:**
   ```bash
   cd expansion-packs/
   ```

2. **The pack should already be present** (this is a test pack created locally)

3. **Verify installation:**
   - Check for `meeting-notes/` directory
   - Verify all components are present

---

## Usage Examples

### Example 1: Create Meeting Notes

```bash
# Activate the meeting organizer agent
@meeting-organizer

# Use the create-notes command
*create-notes
```

The agent will guide you through:
- Capturing meeting metadata (date, time, attendees)
- Documenting agenda and objectives
- Recording discussion points
- Documenting decisions made
- Tracking action items with owners and deadlines

**Output:** Structured markdown file in `meetings/` directory

### Example 2: Get Meeting Guidance

```bash
# Activate the agent in chat mode
@meeting-organizer

# Ask for guidance
"How should I structure a sprint planning meeting?"
```

The agent will provide best practices and guidance based on the knowledge base.

### Example 3: Track Action Items

```bash
@meeting-organizer

*track-actions
```

Review and track action items from previous meetings.

---

## Pack Structure

```
meeting-notes/
├── config.yaml                          # Pack configuration
├── README.md                            # This file
├── agents/
│   └── meeting-organizer.md            # Morgan - Meeting Organization Specialist
├── tasks/
│   └── create-meeting-notes.md         # Create structured meeting notes
├── templates/
│   └── meeting-notes-template.yaml     # Meeting notes output template
├── checklists/
│   └── meeting-effectiveness-checklist.md  # Meeting quality validation
└── data/
    └── meeting-best-practices.md       # Meeting facilitation knowledge
```

---

## Key Features

### Structured Note Format
- Professional meeting documentation
- Consistent structure across all meetings
- Clear sections for agenda, discussions, decisions, and actions

### Action Item Tracking
- Every action item has an owner
- Clear deadlines for accountability
- Easy to track completion

### Decision Documentation
- Explicit capture of all decisions
- Rationale documented for context
- Decision ownership clearly stated

### Best Practices Integration
- Built-in knowledge base
- Meeting effectiveness checklist
- Continuous improvement focus

---

## Integration with AIOS

This pack demonstrates AIOS expansion pack patterns:

- **Agent Activation:** Use `@meeting-organizer` to activate the agent
- **Command Execution:** Use `*create-notes` and other commands
- **Template Usage:** Generates structured markdown outputs
- **Knowledge Access:** Agent has access to meeting best practices
- **Memory Integration:** Can store and retrieve meeting context

---

## Getting Started

1. **Activate the agent:**
   ```
   @meeting-organizer
   ```

2. **Explore available commands:**
   ```
   *help
   ```

3. **Create your first meeting notes:**
   ```
   *create-notes
   ```

4. **Follow the interactive prompts** to document your meeting

---

## Best Practices

- **Prepare Before Meetings:** Create agenda in advance
- **Document Decisions Explicitly:** Don't assume decisions are obvious
- **Assign Action Item Owners:** Every item needs a single owner
- **Set Realistic Deadlines:** Consider workload and dependencies
- **Share Notes Promptly:** Distribute within 24 hours
- **Review Previous Action Items:** Start each meeting with review
- **Use the Checklist:** Validate meeting effectiveness

---

## Dependencies

This pack has no external dependencies beyond AIOS-FULLSTACK core framework.

All components are self-contained within this expansion pack.

---

## Version History

### v1.0.0 (2025-09-30)
- Initial test version created as validation for Expansion Creator Pack
- Includes meeting organizer agent
- Create meeting notes task and template
- Meeting effectiveness checklist
- Meeting best practices knowledge base

---

## Testing Notes

This pack was created as part of testing the **Expansion Creator Pack** functionality. It validates that:

- ✅ Pack structure follows AIOS standards
- ✅ Agent definition is well-formed
- ✅ Task workflow is executable
- ✅ Template generates valid output
- ✅ Checklist provides comprehensive validation
- ✅ Knowledge base offers useful guidance
- ✅ All components integrate properly

---

## Support

This is a test expansion pack. For questions about the Expansion Creator Pack or AIOS framework, refer to the main AIOS documentation.

---

_Pack Version: 1.0.0_
_Last Updated: 2025-09-30_
_Created with: Expansion Creator Pack v1.0_
