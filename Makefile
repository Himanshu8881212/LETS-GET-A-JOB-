.PHONY: all resume cover_letter clean

# Default target
all: resume cover_letter

# Build resume
resume:
	@echo "Building resume..."
	@cd resume && pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1 || true
	@cd resume && pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1 || true
	@mv resume/main.pdf resume.pdf 2>/dev/null || true
	@echo "Resume built: resume.pdf"

# Build cover letter
cover_letter:
	@echo "Building cover letter..."
	@cd cover_letter && pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1 || true
	@cd cover_letter && pdflatex -interaction=nonstopmode main.tex > /dev/null 2>&1 || true
	@mv cover_letter/main.pdf cover_letter.pdf 2>/dev/null || true
	@echo "Cover letter built: cover_letter.pdf"

# Clean auxiliary files
clean:
	@echo "Cleaning auxiliary files..."
	@rm -f resume/*.aux resume/*.log resume/*.out resume/*.toc
	@rm -f cover_letter/*.aux cover_letter/*.log cover_letter/*.out cover_letter/*.toc
	@echo "Clean complete"

