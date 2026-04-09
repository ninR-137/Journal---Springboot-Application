package com.dioneo.journal.repositories;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.dioneo.journal.entities.Note;

public interface NoteRepository extends JpaRepository<Note, Long> {
    List<Note> findByUser_Id(Long userId);
    Page<Note> findByUser_Id(Long userId, Pageable pageable);
    Optional<Note> findByIdAndUser_Id(Long id, Long userId);
}
