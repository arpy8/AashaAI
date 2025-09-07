"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Navbar2 } from "@/components/navbar"
import { ProfileSection } from "@/components/profile-section"
import { Mail, Phone, MapPin, Calendar, Edit3, Upload, GraduationCap, Briefcase, Code } from "lucide-react"
import Image from "next/image"

// Mock profile data
const profileData = {
  personal: {
    name: "Amba Singh",
    email: "amba.singh@email.com",
    phone: "+91 9876543210",
    location: "Delhi, India",
    avatar: "/professional-headshot.png",
    title: "Computer Science Student",
    bio: "Passionate computer science student with experience in full-stack development and machine learning. Seeking internship opportunities to apply my skills and learn from industry professionals.",
  },
  education: [
    {
      id: 1,
      institution: "AKTU, Lucknow, UP",
      degree: "B.Tech in Computer Science",
      period: "2022 - 2026",
      gpa: "8.8/10.0",
      relevant: ["Data Structures", "Algorithms", "Machine Learning", "Web Development"],
    },
    {
      id: 2,
      institution: "Kendriya Vidyalaya, Delhi",
      degree: "Pre-University (Class 11-12)",
      period: "2020 - 2022",
      gpa: "90%",
      relevant: ["Calculus", "Linear Algebra", "Statistics", "Physics"],
    },
  ],
  experience: [
    {
      id: 1,
      company: "TechStart Inc.",
      position: "Software Engineering Intern",
      period: "Jun 2024 - Aug 2024",
      location: "Delhi, India",
      description:
        "Developed responsive web applications using React and TypeScript. Collaborated with design team to implement user interfaces and improved application performance by 25%.",
      skills: ["React", "TypeScript", "CSS", "Git"],
    },
    {
      id: 2,
      company: "ML Academy",
      position: "Machine Learning Intern",
      period: "Jan 2024 - May 2024",
      location: "Gurgaon, India",
      description:
        "Assisted in building machine learning models for predictive analytics. Conducted data preprocessing and feature engineering, resulting in a 15% increase in model accuracy.",
      skills: ["Python", "Teaching", "Mentoring", "Problem Solving"],
    },
  ],
  projects: [
    {
      id: 1,
      name: "TaskFlow - Project Management App",
      period: "Mar 2024 - May 2024",
      description:
        "Built a full-stack project management application with real-time collaboration features. Implemented user authentication, task tracking, and team communication.",
      technologies: ["React", "Node.js", "MongoDB", "Socket.io"],
      github: "https://github.com/alexjohnson/taskflow",
      demo: "https://taskflow-demo.com",
    },
    {
      id: 2,
      name: "ML Stock Predictor",
      period: "Sep 2023 - Dec 2023",
      description:
        "Developed a machine learning model to predict stock prices using historical data and sentiment analysis. Achieved 78% accuracy on test dataset.",
      technologies: ["Python", "TensorFlow", "Pandas", "Scikit-learn"],
      github: "https://github.com/alexjohnson/stock-predictor",
    },
    {
      id: 3,
      name: "Campus Event Finder",
      period: "Jan 2023 - Apr 2023",
      description:
        "Created a mobile-responsive web app to help students discover campus events. Integrated with university APIs and implemented location-based filtering.",
      technologies: ["Vue.js", "Express.js", "PostgreSQL", "Google Maps API"],
      github: "https://github.com/alexjohnson/campus-events",
    },
  ],
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Navbar2 />

      <div className="pt-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <div className="flex space-x-3">
              <Button variant="outline" className="border-border hover:bg-card bg-transparent">
                <Upload className="h-4 w-4 mr-2" />
                Import Resume
              </Button>
              <Button
                onClick={() => setIsEditing(!isEditing)}
                className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                {isEditing ? "Save Changes" : "Edit Profile"}
              </Button>
            </div>
          </div>

          {/* Personal Information */}
          <Card className="p-8 bg-card border-border mb-8">
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              <div className="relative w-32 h-32 rounded-2xl overflow-hidden bg-muted flex-shrink-0">
                <Image
                  src={profileData.personal.avatar || "/placeholder.svg"}
                  alt="Profile picture"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-1">{profileData.personal.name}</h2>
                  <p className="text-lg text-primary font-medium mb-3">{profileData.personal.title}</p>
                  <p className="text-muted-foreground leading-relaxed">{profileData.personal.bio}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>{profileData.personal.email}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>{profileData.personal.phone}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span>{profileData.personal.location}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Education Section */}
          <ProfileSection
            title="Education"
            icon={<GraduationCap className="h-5 w-5" />}
            items={profileData.education}
            renderItem={(edu) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{edu.degree}</h3>
                    <p className="text-primary font-medium">{edu.institution}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {edu.period}
                    </div>
                    <div className="mt-1">GPA: {edu.gpa}</div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {edu.relevant.map((course) => (
                    <Badge key={course} variant="outline" className="border-border">
                      {course}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          />

          {/* Experience Section */}
          <ProfileSection
            title="Experience"
            icon={<Briefcase className="h-5 w-5" />}
            items={profileData.experience}
            renderItem={(exp) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{exp.position}</h3>
                    <p className="text-primary font-medium">{exp.company}</p>
                    <p className="text-sm text-muted-foreground">{exp.location}</p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center">
                      <Calendar className="h-3 w-3 mr-1" />
                      {exp.period}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">{exp.description}</p>
                <div className="flex flex-wrap gap-2">
                  {exp.skills.map((skill) => (
                    <Badge key={skill} variant="outline" className="border-border">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          />

          {/* Projects Section */}
          <ProfileSection
            title="Projects"
            icon={<Code className="h-5 w-5" />}
            items={profileData.projects}
            renderItem={(project) => (
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{project.name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground mt-1">
                      <Calendar className="h-3 w-3 mr-1" />
                      {project.period}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {project.github && (
                      <Button variant="outline" size="sm" className="border-border hover:bg-card bg-transparent">
                        GitHub
                      </Button>
                    )}
                    {project.demo && (
                      <Button variant="outline" size="sm" className="border-border hover:bg-card bg-transparent">
                        Demo
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground leading-relaxed">{project.description}</p>
                <div className="flex flex-wrap gap-2">
                  {project.technologies.map((tech) => (
                    <Badge key={tech} variant="outline" className="border-border">
                      {tech}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          />
        </div>
      </div>
    </div>
  )
}
