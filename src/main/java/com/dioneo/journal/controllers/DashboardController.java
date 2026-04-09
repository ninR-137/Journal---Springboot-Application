package com.dioneo.journal.controllers;

import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;

import com.dioneo.journal.entities.Note;
import com.dioneo.journal.entities.User;
import com.dioneo.journal.repositories.NoteRepository;
import com.dioneo.journal.repositories.UserRepository;

@Controller
public class DashboardController {

    private static final int NOTES_PER_PAGE = 5;
    private static final int MAX_TITLE_LENGTH = 120;
    private static final int MAX_CONTENT_LENGTH = 20000;

    private final NoteRepository noteRepository;
    private final UserRepository userRepository;

    public DashboardController(NoteRepository noteRepository, UserRepository userRepository) {
        this.noteRepository = noteRepository;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public String dashboard(
        Authentication authentication,
        Model model,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(value = "noteId", required = false) Long noteId,
        @RequestParam(value = "newNote", defaultValue = "false") boolean newNote
    ) {
        User user = getAuthenticatedUser(authentication);
        if (user == null) {
            return "redirect:/login";
        }

        int safePage = Math.max(0, page);
        PageRequest pageRequest = PageRequest.of(safePage, NOTES_PER_PAGE, Sort.by(Sort.Direction.DESC, "id"));
        Page<Note> notesPage = noteRepository.findByUser_Id(user.getId(), pageRequest);
        Note selectedNote = resolveSelectedNote(user.getId(), notesPage, noteId, newNote);

        model.addAttribute("username", user.getUsername());
        model.addAttribute("notesPage", notesPage);
        model.addAttribute("selectedNote", selectedNote);
        model.addAttribute("isCreating", newNote || selectedNote == null);
        model.addAttribute("currentPage", safePage);
        model.addAttribute("totalPages", notesPage.getTotalPages());
        model.addAttribute("hasNext", notesPage.hasNext());
        model.addAttribute("hasPrevious", notesPage.hasPrevious());
        model.addAttribute("totalNotes", notesPage.getTotalElements());
        model.addAttribute("maxTitleLength", MAX_TITLE_LENGTH);
        model.addAttribute("maxContentLength", MAX_CONTENT_LENGTH);

        return "dashboard";
    }

    @GetMapping("/notes/new")
    public String newNote(@RequestParam(value = "page", defaultValue = "0") int page) {
        return "redirect:/dashboard?page=" + Math.max(0, page) + "&newNote=true";
    }

    @PostMapping("/notes/save")
    public String saveNote(
        Authentication authentication,
        @RequestParam(value = "noteId", required = false) Long noteId,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam String title,
        @RequestParam String content
    ) {
        User user = getAuthenticatedUser(authentication);
        if (user == null) {
            return "redirect:/login";
        }

        try {
            Note savedNote = persistNote(user, noteId, title, content);
            int redirectPage = noteId == null ? 0 : Math.max(0, page);

            return "redirect:/dashboard?page=" + redirectPage + "&noteId=" + savedNote.getId();
        } catch (IllegalArgumentException ex) {
            String redirectUrl = "redirect:/dashboard?page=" + Math.max(0, page);
            if (noteId != null) {
                redirectUrl += "&noteId=" + noteId;
            }
            return redirectUrl;
        }
    }

    @PostMapping("/notes/autosave")
    @ResponseBody
    public Map<String, Object> autosaveNote(
        Authentication authentication,
        @RequestParam(value = "noteId", required = false) Long noteId,
        @RequestParam(value = "page", defaultValue = "0") int page,
        @RequestParam(required = false) String title,
        @RequestParam(required = false) String content
    ) {
        User user = getAuthenticatedUser(authentication);
        if (user == null) {
            return Map.of(
                "success", false,
                "message", "Unauthorized"
            );
        }

        boolean noContentYet = noteId == null
            && (title == null || title.isBlank())
            && (content == null || content.isBlank());

        if (noContentYet) {
            return Map.of(
                "success", true,
                "skipped", true,
                "message", "Nothing to autosave yet"
            );
        }

        try {
            Note savedNote = persistNote(user, noteId, title, content);

            return Map.of(
                "success", true,
                "noteId", savedNote.getId(),
                "title", savedNote.getTitle(),
                "content", savedNote.getContent(),
                "page", Math.max(0, page)
            );
        } catch (IllegalArgumentException ex) {
            return Map.of(
                "success", false,
                "message", ex.getMessage()
            );
        }
    }

    @PostMapping("/notes/{id}/delete")
    public String deleteNote(
        Authentication authentication,
        @PathVariable Long id,
        @RequestParam(value = "page", defaultValue = "0") int page
    ) {
        User user = getAuthenticatedUser(authentication);
        if (user != null) {
            noteRepository.findByIdAndUser_Id(id, user.getId()).ifPresent(noteRepository::delete);
        }

        return "redirect:/dashboard?page=" + Math.max(0, page);
    }

    @GetMapping("/")
    public String root(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            return "redirect:/dashboard";
        }
        return "redirect:/login";
    }

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return userRepository.findByUsername(authentication.getName()).orElse(null);
    }

    private Note persistNote(User user, Long noteId, String title, String content) {
        validateNoteInput(title, content);

        Note note = noteId == null
            ? new Note()
            : noteRepository.findByIdAndUser_Id(noteId, user.getId()).orElseGet(Note::new);

        note.setUser(user);
        note.setTitle(title == null || title.isBlank() ? "Untitled note" : title.trim());
        note.setContent(content == null ? "" : content);

        return noteRepository.save(note);
    }

    private void validateNoteInput(String title, String content) {
        if (title != null && title.length() > MAX_TITLE_LENGTH) {
            throw new IllegalArgumentException("Title limit is " + MAX_TITLE_LENGTH + " characters.");
        }

        if (content != null && content.length() > MAX_CONTENT_LENGTH) {
            throw new IllegalArgumentException("Note limit is " + MAX_CONTENT_LENGTH + " characters.");
        }
    }

    private Note resolveSelectedNote(Long userId, Page<Note> notesPage, Long noteId, boolean newNote) {
        if (newNote) {
            return null;
        }

        if (noteId != null) {
            return noteRepository.findByIdAndUser_Id(noteId, userId)
                .orElseGet(() -> notesPage.hasContent() ? notesPage.getContent().get(0) : null);
        }

        return notesPage.hasContent() ? notesPage.getContent().get(0) : null;
    }
}
